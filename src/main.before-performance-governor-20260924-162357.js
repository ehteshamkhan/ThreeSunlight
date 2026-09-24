import * as THREE from 'three/webgpu';


    
// THREE_SUNLIGHT_HIGH_PERFORMANCE_CITY_START
//
// High-performance city controller.
// This layer deliberately does not rebuild the existing city.
// It controls quality, nearby labels, and expensive maintenance
// work without creating another renderer or another scene.

const TSHP = {

    // --------------------------------------------------------
    // FPS TARGETS
    // --------------------------------------------------------

    targetFPS: 45,

    lowFPS: 28,

    criticalFPS: 20,

    recoveryFPS: 52,

    // --------------------------------------------------------
    // CITY QUALITY
    // --------------------------------------------------------

    quality: 1.0,

    minQuality: 0.32,

    maxQuality: 1.0,

    qualityStepDown: 0.12,

    qualityStepUp: 0.06,

    // --------------------------------------------------------
    // CITY DISTANCE
    // --------------------------------------------------------

    fullRadius: 420,

    mediumRadius: 300,

    lowRadius: 220,

    criticalRadius: 150,

    activeRadius: 300,

    // --------------------------------------------------------
    // LABELS
    // --------------------------------------------------------

    maxLabelsHigh: 40,

    maxLabelsMedium: 24,

    maxLabelsLow: 12,

    maxLabelsCritical: 6,

    maxLabels: 24,

    labelUpdateInterval: 180,

    lastLabelUpdate: 0,

    // --------------------------------------------------------
    // CITY UPDATE
    // --------------------------------------------------------

    cityUpdateInterval: 180,

    lastCityUpdate: 0,

    // --------------------------------------------------------
    // FPS SAMPLING
    // --------------------------------------------------------

    fpsSampleInterval: 750,

    lastFPSSample: 0,

    frameCounter: 0,

    fps: 60,

    // --------------------------------------------------------
    // CAMERA MOVEMENT
    // --------------------------------------------------------

    lastCameraX: null,

    lastCameraY: null,

    lastCameraZ: null,

    cameraSpeed: 0,

    // --------------------------------------------------------
    // DOM LABELS
    // --------------------------------------------------------

    labelLayer: null,

    labels: [],

    labelPool: [],

    initialized: false,

    // --------------------------------------------------------
    // STATE
    // --------------------------------------------------------

    lastQualityChange: 0,

    qualityChangeCooldown: 1200,

    // --------------------------------------------------------
    // SAFE INITIALIZATION
    // --------------------------------------------------------

    init() {

        if (this.initialized) {
            return;
        }

        this.initialized = true;

        this.createLabelLayer();

        this.captureCameraPosition();

        this.installResizeHandler();

    },

    // --------------------------------------------------------
    // LABEL CONTAINER
    // --------------------------------------------------------

    createLabelLayer() {

        if (this.labelLayer) {
            return;
        }

        const existing = document.getElementById(
            'three-sunlight-building-label-layer'
        );

        if (existing) {
            this.labelLayer = existing;
            return;
        }

        const layer = document.createElement('div');

        layer.id = 'three-sunlight-building-label-layer';

        layer.style.position = 'fixed';
        layer.style.left = '0';
        layer.style.top = '0';
        layer.style.width = '100%';
        layer.style.height = '100%';
        layer.style.pointerEvents = 'none';
        layer.style.zIndex = '20';
        layer.style.overflow = 'hidden';

        document.body.appendChild(layer);

        this.labelLayer = layer;

    },

    // --------------------------------------------------------
    // RESIZE
    // --------------------------------------------------------

    installResizeHandler() {

        window.addEventListener(
            'resize',
            () => {

                for (const label of this.labels) {

                    if (!label.element) {
                        continue;
                    }

                    label.element.style.transform =
                        'translate3d(-99999px,-99999px,0)';

                }

            },
            { passive: true }
        );

    },

    // --------------------------------------------------------
    // CAMERA POSITION
    // --------------------------------------------------------

    captureCameraPosition() {

        if (
            typeof camera === 'undefined' ||
            !camera ||
            !camera.position
        ) {
            return;
        }

        this.lastCameraX = camera.position.x;
        this.lastCameraY = camera.position.y;
        this.lastCameraZ = camera.position.z;

    },

    // --------------------------------------------------------
    // CAMERA SPEED
    // --------------------------------------------------------

    updateCameraSpeed(delta) {

        if (
            typeof camera === 'undefined' ||
            !camera ||
            !camera.position
        ) {
            return;
        }

        if (
            this.lastCameraX === null ||
            this.lastCameraY === null ||
            this.lastCameraZ === null
        ) {

            this.captureCameraPosition();

            return;

        }

        const dx = camera.position.x - this.lastCameraX;
        const dy = camera.position.y - this.lastCameraY;
        const dz = camera.position.z - this.lastCameraZ;

        const distance = Math.sqrt(
            dx * dx +
            dy * dy +
            dz * dz
        );

        const safeDelta = Math.max(
            0.001,
            Math.min(delta, 0.1)
        );

        this.cameraSpeed =
            distance / safeDelta;

        this.lastCameraX = camera.position.x;
        this.lastCameraY = camera.position.y;
        this.lastCameraZ = camera.position.z;

    },

    // --------------------------------------------------------
    // FPS SAMPLING
    // --------------------------------------------------------

    sampleFPS(now) {

        this.frameCounter++;

        if (
            this.lastFPSSample === 0
        ) {

            this.lastFPSSample = now;

            return;

        }

        const elapsed =
            now - this.lastFPSSample;

        if (elapsed < this.fpsSampleInterval) {
            return;
        }

        this.fps =
            this.frameCounter /
            (elapsed / 1000);

        this.frameCounter = 0;

        this.lastFPSSample = now;

        this.updateQuality();

    },

    // --------------------------------------------------------
    // ADAPTIVE QUALITY
    // --------------------------------------------------------

    updateQuality() {

        const now = performance.now();

        if (
            now -
            this.lastQualityChange <
            this.qualityChangeCooldown
        ) {
            return;
        }

        // Fast camera movement gets a temporary quality reduction.
        const movingFast =
            this.cameraSpeed > 45;

        // Severe frame-rate loss.
        if (
            this.fps <= this.criticalFPS
        ) {

            this.quality = Math.max(
                this.minQuality,
                this.quality -
                this.qualityStepDown * 2
            );

            this.lastQualityChange = now;

            this.applyQuality();

            return;
        }

        // Moderate frame-rate loss.
        if (
            this.fps < this.lowFPS ||
            movingFast
        ) {

            this.quality = Math.max(
                this.minQuality,
                this.quality -
                this.qualityStepDown
            );

            this.lastQualityChange = now;

            this.applyQuality();

            return;
        }

        // Recovery.
        if (
            this.fps >= this.recoveryFPS &&
            !movingFast
        ) {

            this.quality = Math.min(
                this.maxQuality,
                this.quality +
                this.qualityStepUp
            );

            this.lastQualityChange = now;

            this.applyQuality();

        }

    },

    // --------------------------------------------------------
    // QUALITY -> CITY RADIUS / LABEL COUNT
    // --------------------------------------------------------

    applyQuality() {

        if (this.quality >= 0.85) {

            this.activeRadius =
                this.fullRadius;

            this.maxLabels =
                this.maxLabelsHigh;

        }
        else if (this.quality >= 0.65) {

            this.activeRadius =
                this.mediumRadius;

            this.maxLabels =
                this.maxLabelsMedium;

        }
        else if (this.quality >= 0.45) {

            this.activeRadius =
                this.lowRadius;

            this.maxLabels =
                this.maxLabelsLow;

        }
        else {

            this.activeRadius =
                this.criticalRadius;

            this.maxLabels =
                this.maxLabelsCritical;

        }

        this.limitExistingCityObjects();

    },

    // --------------------------------------------------------
    // EXISTING CITY CONTROL
    // --------------------------------------------------------
    //
    // We do NOT rebuild the existing city.
    //
    // If the current architecture exposes spatial chunks,
    // only nearby chunks remain visible.
    //
    // If the current architecture exposes groups, the groups
    // remain under the existing visibility system.
    //
    // The function is deliberately defensive.

    limitExistingCityObjects() {

        if (
            typeof compiledCityBuildingGroup ===
            'undefined' ||
            !compiledCityBuildingGroup
        ) {
            return;
        }

        const group =
            compiledCityBuildingGroup;

        const radiusSq =
            this.activeRadius *
            this.activeRadius;

        // If the existing renderer has chunk-like children,
        // control them conservatively.
        if (
            group.children &&
            group.children.length > 0
        ) {

            const children =
                group.children;

            for (
                let i = 0;
                i < children.length;
                i++
            ) {

                const child =
                    children[i];

                if (!child) {
                    continue;
                }

                // Never forcibly hide the complete city.
                // Existing lazy systems retain authority when
                // they expose their own visibility property.

                if (
                    child.userData &&
                    child.userData.cityChunk &&
                    child.userData.cityCenter
                ) {

                    const center =
                        child.userData.cityCenter;

                    if (
                        typeof center.x === 'number' &&
                        typeof center.z === 'number' &&
                        typeof camera !== 'undefined' &&
                        camera &&
                        camera.position
                    ) {

                        const dx =
                            center.x -
                            camera.position.x;

                        const dz =
                            center.z -
                            camera.position.z;

                        const distanceSq =
                            dx * dx +
                            dz * dz;

                        child.visible =
                            distanceSq <= radiusSq;

                    }

                }

            }

        }

    },

    // --------------------------------------------------------
    // BUILDING LABEL CREATION
    // --------------------------------------------------------

    createLabel(number) {

        const element =
            document.createElement('div');

        element.style.position = 'absolute';
        element.style.left = '0';
        element.style.top = '0';
        element.style.transform =
            'translate3d(-99999px,-99999px,0)';
        element.style.padding =
            '3px 8px';
        element.style.borderRadius =
            '5px';
        element.style.background =
            'rgba(0,0,0,0.82)';
        element.style.border =
            '1px solid rgba(255,255,255,0.45)';
        element.style.color =
            '#ffffff';
        element.style.fontFamily =
            'Arial, Helvetica, sans-serif';
        element.style.fontSize =
            '11px';
        element.style.fontWeight =
            '700';
        element.style.whiteSpace =
            'nowrap';
        element.style.textShadow =
            '0 1px 3px #000';
        element.style.boxShadow =
            '0 2px 8px rgba(0,0,0,0.45)';
        element.style.display =
            'none';

        element.textContent =
            String(number);

        this.labelLayer.appendChild(element);

        return {

            element,

            number,

            world:
                new THREE.Vector3(),

            distanceSq:
                Infinity

        };

    },

    // --------------------------------------------------------
    // LABEL DATA DISCOVERY
    // --------------------------------------------------------
    //
    // The existing application may expose its building data
    // under several names. We inspect only known lightweight
    // arrays and never traverse arbitrary scene geometry.
    //

    getBuildingRecords() {

        const candidates = [

            typeof compiledCityBuildings !== 'undefined'
                ? compiledCityBuildings
                : null,

            typeof compiledCityRecords !== 'undefined'
                ? compiledCityRecords
                : null,

            typeof cityBuildings !== 'undefined'
                ? cityBuildings
                : null,

            typeof buildingRecords !== 'undefined'
                ? buildingRecords
                : null

        ];

        for (const candidate of candidates) {

            if (
                Array.isArray(candidate) &&
                candidate.length > 0
            ) {

                return candidate;

            }

        }

        return null;

    },

    // --------------------------------------------------------
    // FIND WORLD POSITION
    // --------------------------------------------------------

    getRecordPosition(record, target) {

        if (!record) {
            return false;
        }

        let x = null;
        let y = null;
        let z = null;

        if (
            typeof record.x === 'number' &&
            typeof record.z === 'number'
        ) {

            x = record.x;
            z = record.z;

            y =
                typeof record.y === 'number'
                    ? record.y
                    : 0;

        }
        else if (
            record.position &&
            typeof record.position.x === 'number' &&
            typeof record.position.z === 'number'
        ) {

            x =
                record.position.x;

            y =
                typeof record.position.y === 'number'
                    ? record.position.y
                    : 0;

            z =
                record.position.z;

        }
        else if (
            Array.isArray(record.position) &&
            record.position.length >= 3
        ) {

            x = Number(record.position[0]);
            y = Number(record.position[1]);
            z = Number(record.position[2]);

        }

        if (
            !Number.isFinite(x) ||
            !Number.isFinite(y) ||
            !Number.isFinite(z)
        ) {

            return false;

        }

        target.set(
            x,
            y,
            z
        );

        return true;

    },

    // --------------------------------------------------------
    // LABEL UPDATE
    // --------------------------------------------------------

    updateLabels(now) {

        if (
            !this.labelLayer
        ) {
            return;
        }

        if (
            now -
            this.lastLabelUpdate <
            this.labelUpdateInterval
        ) {
            return;
        }

        this.lastLabelUpdate =
            now;

        const records =
            this.getBuildingRecords();

        if (
            !records ||
            records.length === 0 ||
            typeof camera === 'undefined' ||
            !camera
        ) {

            this.hideAllLabels();

            return;

        }

        const nearby = [];

        const cameraPosition =
            camera.position;

        const radius =
            this.activeRadius;

        const radiusSq =
            radius * radius;

        const temp =
            new THREE.Vector3();

        // Limit scanning so the browser never spends a
        // frame walking thousands of records.
        //
        // We sample records spatially by stride when the
        // source array is extremely large.

        const maximumRecordsToInspect =
            Math.min(
                records.length,
                900
            );

        const stride =
            Math.max(
                1,
                Math.ceil(
                    records.length /
                    maximumRecordsToInspect
                )
            );

        for (
            let i = 0;
            i < records.length;
            i += stride
        ) {

            const record =
                records[i];

            if (
                !this.getRecordPosition(
                    record,
                    temp
                )
            ) {
                continue;
            }

            const dx =
                temp.x -
                cameraPosition.x;

            const dy =
                temp.y -
                cameraPosition.y;

            const dz =
                temp.z -
                cameraPosition.z;

            const distanceSq =
                dx * dx +
                dy * dy +
                dz * dz;

            if (
                distanceSq > radiusSq
            ) {
                continue;
            }

            nearby.push({

                index: i,

                x: temp.x,

                y: temp.y,

                z: temp.z,

                distanceSq

            });

        }

        nearby.sort(
            (a, b) =>
                a.distanceSq -
                b.distanceSq
        );

        const selected =
            nearby.slice(
                0,
                this.maxLabels
            );

        while (
            this.labels.length <
            selected.length
        ) {

            this.labels.push(
                this.createLabel(
                    ''
                )
            );

        }

        for (
            let i = 0;
            i < this.labels.length;
            i++
        ) {

            const label =
                this.labels[i];

            if (
                i >= selected.length
            ) {

                label.element.style.display =
                    'none';

                continue;

            }

            const building =
                selected[i];

            label.number =
                building.index + 1;

            label.world.set(
                building.x,
                building.y,
                building.z
            );

            label.element.textContent =
                'BUILDING ' +
                String(
                    building.index + 1
                );

            this.positionLabel(
                label
            );

        }

    },

    // --------------------------------------------------------
    // LABEL POSITION
    // --------------------------------------------------------

    positionLabel(label) {

        if (
            typeof camera === 'undefined' ||
            !camera ||
            !camera.position
        ) {
            return;
        }

        const point =
            label.world.clone();

        point.y += 10;

        point.project(camera);

        const x =
            (point.x * 0.5 + 0.5) *
            window.innerWidth;

        const y =
            (-point.y * 0.5 + 0.5) *
            window.innerHeight;

        if (
            point.z < -1 ||
            point.z > 1
        ) {

            label.element.style.display =
                'none';

            return;

        }

        label.element.style.display =
            'block';

        label.element.style.transform =
            'translate3d(' +
            Math.round(x) +
            'px,' +
            Math.round(y) +
            'px,0) ' +
            'translate(-50%,-100%)';

    },

    // --------------------------------------------------------
    // LOW-COST LABEL POSITION UPDATE
    // --------------------------------------------------------

    repositionVisibleLabels() {

        if (
            this.labels.length === 0
        ) {
            return;
        }

        for (
            const label of this.labels
        ) {

            if (
                label.element.style.display ===
                'none'
            ) {
                continue;
            }

            this.positionLabel(
                label
            );

        }

    },

    // --------------------------------------------------------
    // HIDE LABELS
    // --------------------------------------------------------

    hideAllLabels() {

        for (
            const label of this.labels
        ) {

            label.element.style.display =
                'none';

        }

    },

    // --------------------------------------------------------
    // MAIN PERFORMANCE TICK
    // --------------------------------------------------------

    tick(now, delta) {

        if (!this.initialized) {
            this.init();
        }

        this.updateCameraSpeed(
            delta
        );

        this.sampleFPS(
            now
        );

        // City visibility is intentionally low-frequency.
        // It should never run at 60/120/144 Hz.
        if (
            now -
            this.lastCityUpdate >=
            this.cityUpdateInterval
        ) {

            this.lastCityUpdate =
                now;

            this.limitExistingCityObjects();

        }

        this.updateLabels(
            now
        );

        // Label positions are cheap, but only update them
        // when the label system is actually active.
        if (
            this.labels.length > 0
        ) {

            this.repositionVisibleLabels();

        }

    },

    // --------------------------------------------------------
    // DEBUG
    // --------------------------------------------------------

    getStats() {

        return {

            fps:
                Math.round(
                    this.fps
                ),

            quality:
                Number(
                    this.quality.toFixed(2)
                ),

            radius:
                this.activeRadius,

            labels:
                this.maxLabels,

            cameraSpeed:
                Number(
                    this.cameraSpeed.toFixed(1)
                )

        };

    }

};

// ------------------------------------------------------------
// INITIALIZATION
// ------------------------------------------------------------

try {

    TSHP.init();

    TSHP.applyQuality();

}
catch (error) {

    console.warn(
        '[ThreeSunlight] Performance controller initialization failed:',
        error
    );

}

// ------------------------------------------------------------
// ANIMATION HOOK
// ------------------------------------------------------------
//
// Rather than replacing the existing animation loop, this
// wrapper exposes a tiny global function that can be called
// from the existing loop.
//
// The installer below attempts to connect it safely.
// ------------------------------------------------------------

globalThis.__THREE_SUNLIGHT_HIGH_PERFORMANCE_TICK__ =
    function(now, delta) {

        try {

            TSHP.tick(
                now,
                delta
            );

        }
        catch (error) {

            console.warn(
                '[ThreeSunlight] Performance tick failed:',
                error
            );

        }

    };

// THREE_SUNLIGHT_HIGH_PERFORMANCE_CITY_END
import {
    color,
    cos,
    float,
    mix,
    range,
    sin,
    time,
    uniform,
    uv,
    vec3,
    vec4,
    TWO_PI
} from 'three/tsl';

import {
    FirstPersonControls
} from 'three/addons/controls/FirstPersonControls.js';

import {
    Inspector
} from 'three/addons/inspector/Inspector.js';

import {
    SunLight
} from 'three/addons/lights/SunLight.js';

import {
    SunLightNode
} from 'three/addons/lights/SunLightNode.js';

import './style.css';

let renderer;
let scene;
let camera;
let controls;
let timer;
let sunLight;
/* THREE SUNLIGHT - CINEMATIC EMERALD THEME START */

/*
 * ============================================================
 * CINEMATIC EMERALD + DEEP BLUE VISUAL SYSTEM
 * ============================================================
 *
 * Buildings:
 *   Deep blue / emerald
 *   Metallic response
 *   Subtle emerald emissive accent
 *
 * Ground:
 *   Dark emerald
 *   Slight blue undertone
 *   High roughness
 *
 * This changes visual materials only.
 *
 * Existing:
 *   building dimensions
 *   building positions
 *   facades
 *   collision
 *   camera
 *   X/Z boundary
 *   Y ground protection
 *   sky
 *   forest
 *   sun
 *
 * remain untouched.
 */


/* ============================================================
 * CINEMATIC BUILDING MATERIAL
 * ============================================================ */

const THREE_SUNLIGHT_BUILDING_COLOR =
    0x071d2b;

const THREE_SUNLIGHT_BUILDING_EMISSIVE =
    0x063f38;


const threeSunlightCinematicBuildingMaterial =
    new THREE.MeshStandardMaterial({

        color:
            THREE_SUNLIGHT_BUILDING_COLOR,

        emissive:
            THREE_SUNLIGHT_BUILDING_EMISSIVE,

        emissiveIntensity:
            0.22,

        roughness:
            0.48,

        metalness:
            0.62,

        side:
            THREE.FrontSide
    });


/*
 * Apply the cinematic building material to the
 * existing compiled-city InstancedMesh.
 *
 * No geometry is changed.
 */
function threeSunlightApplyCinematicBuildingMaterial() {

    if (
        typeof instancedBuildings === 'undefined' ||
        !instancedBuildings
    ) {

        console.warn(
            'Three Sunlight: compiled building mesh unavailable for cinematic material.'
        );

        return;
    }


    instancedBuildings.material =
        threeSunlightCinematicBuildingMaterial;


    instancedBuildings.material.needsUpdate =
        true;


    console.log(
        'Three Sunlight: CINEMATIC EMERALD / DEEP BLUE BUILDINGS ACTIVE'
    );
}


/* ============================================================
 * GROUND MATERIAL
 * ============================================================ */

const THREE_SUNLIGHT_GROUND_COLOR =
    0x071f1a;

const THREE_SUNLIGHT_GROUND_EMISSIVE =
    0x021812;


/*
 * Large ground surface.
 *
 * It sits exactly at world Y = 0,
 * matching the bottom of the compiled buildings.
 */
let threeSunlightCinematicGround = null;


function threeSunlightCreateCinematicGround() {

    if (
        threeSunlightCinematicGround
    ) {
        return;
    }


    const groundSize =
        12000;


    const groundGeometry =
        new THREE.PlaneGeometry(
            groundSize,
            groundSize,
            1,
            1
        );


    const groundMaterial =
        new THREE.MeshStandardMaterial({

            color:
                THREE_SUNLIGHT_GROUND_COLOR,

            emissive:
                THREE_SUNLIGHT_GROUND_EMISSIVE,

            emissiveIntensity:
                0.08,

            roughness:
                0.91,

            metalness:
                0.08,

            side:
                THREE.DoubleSide,

            /*
             * Keep the ground physically at Y = 0.
             *
             * Polygon offset changes depth-buffer placement only.
             * It prevents the ground from competing with building
             * base surfaces occupying the same world plane.
             */
            polygonOffset:
                true,

            polygonOffsetFactor:
                4,

            polygonOffsetUnits:
                4
        });


    threeSunlightCinematicGround =
        new THREE.Mesh(
            groundGeometry,
            groundMaterial
        );


    threeSunlightCinematicGround.name =
        'ThreeSunlightCinematicEmeraldGround';


    threeSunlightCinematicGround.rotation.x =
        -Math.PI / 2;


    threeSunlightCinematicGround.position.y =
        0;


    threeSunlightCinematicGround.renderOrder =
        -10;


    scene.add(
        threeSunlightCinematicGround
    );


    console.log(
        'Three Sunlight: CINEMATIC EMERALD GROUND ACTIVE'
    );
}


/* ============================================================
 * COMBINED ACTIVATION
 * ============================================================ */

function threeSunlightCreateCinematicGroundAndMaterials() {

    threeSunlightApplyCinematicBuildingMaterial();

    threeSunlightCreateCinematicGround();


    console.log(
        'Three Sunlight: CINEMATIC EMERALD / DEEP BLUE WORLD ACTIVE'
    );
}


/* THREE SUNLIGHT - CINEMATIC EMERALD THEME END */

/* THREE SUNLIGHT - FIXED LOGICAL GROUND START */

/*
 * The compiled buildings are constructed with their
 * bottom exactly at world Y = 0.
 *
 * We therefore use a fixed logical ground instead of
 * relying on an InstancedMesh bounding box.
 *
 * NO FLOOR GEOMETRY IS CREATED.
 */

const THREE_SUNLIGHT_GROUND_Y = 1.8;


/*
 * Keep the camera above the logical ground.
 *
 * This runs after FirstPersonControls.update()
 * and after building collision.
 *
 * X and Z are completely untouched.
 */
function threeSunlightProtectGround() {

    if (
        !camera
    ) {
        return;
    }


    if (
        camera.position.y <
        THREE_SUNLIGHT_GROUND_Y
    ) {

        camera.position.y =
            THREE_SUNLIGHT_GROUND_Y;
    }
}


/* THREE SUNLIGHT - FIXED LOGICAL GROUND END */

/* THREE SUNLIGHT - INVISIBLE STRUCTURE BOUNDARIES START */

const THREE_SUNLIGHT_SCENE_BOUNDARY_MARGIN = 25;

let threeSunlightSceneBoundary = null;


/*
 * Detect the horizontal outer perimeter of the
 * compiled building structure.
 *
 * Only X and Z are used.
 */
function threeSunlightCreateSceneBoundary() {

    if (
        typeof instancedBuildings === 'undefined' ||
        !instancedBuildings
    ) {
        console.warn(
            'Three Sunlight: compiled buildings unavailable for boundary.'
        );

        return;
    }


    instancedBuildings.updateMatrixWorld(
        true
    );


    instancedBuildings.computeBoundingBox();


    if (
        !instancedBuildings.boundingBox
    ) {
        console.warn(
            'Three Sunlight: compiled building bounding box unavailable.'
        );

        return;
    }


    const structureBounds =
        instancedBuildings.boundingBox.clone();


    structureBounds.applyMatrix4(
        instancedBuildings.matrixWorld
    );


    threeSunlightSceneBoundary = {

        minX:
            structureBounds.min.x -
            THREE_SUNLIGHT_SCENE_BOUNDARY_MARGIN,

        maxX:
            structureBounds.max.x +
            THREE_SUNLIGHT_SCENE_BOUNDARY_MARGIN,

        minZ:
            structureBounds.min.z -
            THREE_SUNLIGHT_SCENE_BOUNDARY_MARGIN,

        maxZ:
            structureBounds.max.z +
            THREE_SUNLIGHT_SCENE_BOUNDARY_MARGIN
    };


    console.log(
        'Three Sunlight: INVISIBLE X / Z STRUCTURE BOUNDARY ACTIVE'
    );


    console.log(
        'Three Sunlight X/Z boundary:',
        threeSunlightSceneBoundary
    );
}


/*
 * Horizontal containment only.
 *
 * IMPORTANT:
 * The executable statements below modify ONLY:
 *
 *   camera.position.x
 *   camera.position.z
 *
 * Vertical camera position is completely untouched.
 */
function threeSunlightClampCameraToSceneBoundary() {

    if (
        !threeSunlightSceneBoundary ||
        !camera
    ) {
        return;
    }


    const bounds =
        threeSunlightSceneBoundary;


    camera.position.x =
        THREE.MathUtils.clamp(
            camera.position.x,
            bounds.minX,
            bounds.maxX
        );


    camera.position.z =
        THREE.MathUtils.clamp(
            camera.position.z,
            bounds.minZ,
            bounds.maxZ
        );
}


/* THREE SUNLIGHT - INVISIBLE STRUCTURE BOUNDARIES END */


const params = {

    far: 1000,

    resolution: 2048,

    azimuth: 135,

    elevation: 20,

};

const sunDay =
    new THREE.Color(0xfff2e3);

const sunDusk =
    new THREE.Color(0xff8a3d);

// ============================================================
// SUN
// ============================================================

function updateSun() {

    sunLight.position
        .setFromSphericalCoords(

            1,

            THREE.MathUtils.degToRad(
                90 -
                params.elevation
            ),

            THREE.MathUtils.degToRad(
                params.azimuth
            )

        );

    const daylight =
        Math.min(
            1,
            params.elevation / 30
        );

    sunLight.color.lerpColors(
        sunDusk,
        sunDay,
        daylight
    );

    sunLight.intensity =
        3 +
        daylight * 2;
}

// ============================================================
// EXACT FACADE TEXT
// ============================================================

// ============================================================
// INIT
// ============================================================

async function init() {

    
scene =
        new THREE.Scene();

/* THREE SUNLIGHT - BLUE SUNLIT FOREST UNIVERSE THEME START */

(function() {

    /*
     * ========================================================
     * BLUE DAYTIME SKY
     * ========================================================
     */

    const threeSunlightSkyCanvas =
        document.createElement('canvas');

    threeSunlightSkyCanvas.width =
        2048;

    threeSunlightSkyCanvas.height =
        1024;

    const threeSunlightSkyContext =
        threeSunlightSkyCanvas.getContext('2d');

    /*
     * Deep blue -> bright blue -> green forest horizon.
     */

    const skyGradient =
        threeSunlightSkyContext.createLinearGradient(
            0,
            0,
            0,
            1024
        );

    skyGradient.addColorStop(
        0.00,
        '#04132f'
    );

    skyGradient.addColorStop(
        0.18,
        '#0b2e62'
    );

    skyGradient.addColorStop(
        0.38,
        '#155f98'
    );

    skyGradient.addColorStop(
        0.58,
        '#3d91b8'
    );

    skyGradient.addColorStop(
        0.73,
        '#82bdc8'
    );

    skyGradient.addColorStop(
        0.84,
        '#557f67'
    );

    skyGradient.addColorStop(
        1.00,
        '#0a2e20'
    );

    threeSunlightSkyContext.fillStyle =
        skyGradient;

    threeSunlightSkyContext.fillRect(
        0,
        0,
        2048,
        1024
    );

    /*
     * ========================================================
     * LARGE SOFT SUN GLOW
     * ========================================================
     */

    const sunX =
        2048 * 0.72;

    const sunY =
        1024 * 0.25;

    const sunGlow =
        threeSunlightSkyContext.createRadialGradient(
            sunX,
            sunY,
            5,
            sunX,
            sunY,
            370
        );

    sunGlow.addColorStop(
        0.00,
        'rgba(255,255,245,1.0)'
    );

    sunGlow.addColorStop(
        0.08,
        'rgba(255,251,220,0.90)'
    );

    sunGlow.addColorStop(
        0.20,
        'rgba(255,239,175,0.48)'
    );

    sunGlow.addColorStop(
        0.42,
        'rgba(255,220,135,0.16)'
    );

    sunGlow.addColorStop(
        0.70,
        'rgba(255,210,120,0.04)'
    );

    sunGlow.addColorStop(
        1.00,
        'rgba(255,210,120,0)'
    );

    threeSunlightSkyContext.fillStyle =
        sunGlow;

    threeSunlightSkyContext.fillRect(
        sunX - 400,
        sunY - 400,
        800,
        800
    );

    /*
     * ========================================================
     * SUN DISC
     * ========================================================
     */

    const sunDisc =
        threeSunlightSkyContext.createRadialGradient(
            sunX,
            sunY,
            0,
            sunX,
            sunY,
            65
        );

    sunDisc.addColorStop(
        0,
        'rgba(255,255,255,1)'
    );

    sunDisc.addColorStop(
        0.35,
        'rgba(255,252,225,1)'
    );

    sunDisc.addColorStop(
        0.70,
        'rgba(255,235,170,0.85)'
    );

    sunDisc.addColorStop(
        1,
        'rgba(255,220,135,0)'
    );

    threeSunlightSkyContext.fillStyle =
        sunDisc;

    threeSunlightSkyContext.beginPath();

    threeSunlightSkyContext.arc(
        sunX,
        sunY,
        65,
        0,
        Math.PI * 2
    );

    threeSunlightSkyContext.fill();

    /*
     * ========================================================
     * ATMOSPHERIC LIGHT HAZE
     * ========================================================
     */

    const atmosphere =
        threeSunlightSkyContext.createLinearGradient(
            0,
            430,
            0,
            800
        );

    atmosphere.addColorStop(
        0,
        'rgba(220,245,255,0)'
    );

    atmosphere.addColorStop(
        0.35,
        'rgba(205,238,245,0.18)'
    );

    atmosphere.addColorStop(
        0.65,
        'rgba(140,210,195,0.15)'
    );

    atmosphere.addColorStop(
        1,
        'rgba(50,120,80,0)'
    );

    threeSunlightSkyContext.fillStyle =
        atmosphere;

    threeSunlightSkyContext.fillRect(
        0,
        380,
        2048,
        440
    );

    /*
     * ========================================================
     * FOREST HORIZON
     * ========================================================
     */

    function drawForestLayer(
        baseY,
        height,
        color,
        spacing,
        seed
    ) {

        threeSunlightSkyContext.fillStyle =
            color;

        threeSunlightSkyContext.beginPath();

        threeSunlightSkyContext.moveTo(
            0,
            1024
        );

        threeSunlightSkyContext.lineTo(
            0,
            baseY
        );

        let x = -40;
        let randomSeed = seed;

        while (
            x <
            2090
        ) {

            randomSeed =
                (
                    randomSeed * 9301 +
                    49297
                ) % 233280;

            const random =
                randomSeed / 233280;

            const treeHeight =
                height *
                (
                    0.55 +
                    random * 0.75
                );

            const treeWidth =
                spacing *
                (
                    0.72 +
                    random * 0.55
                );

            threeSunlightSkyContext.moveTo(
                x,
                baseY
            );

            threeSunlightSkyContext.lineTo(
                x + treeWidth * 0.5,
                baseY - treeHeight
            );

            threeSunlightSkyContext.lineTo(
                x + treeWidth,
                baseY
            );

            x +=
                treeWidth * 0.72;
        }

        threeSunlightSkyContext.lineTo(
            2048,
            1024
        );

        threeSunlightSkyContext.closePath();

        threeSunlightSkyContext.fill();
    }

    /*
     * Distant forest.
     */

    drawForestLayer(
        760,
        130,
        'rgba(45,91,70,0.45)',
        45,
        19
    );

    /*
     * Middle forest.
     */

    drawForestLayer(
        825,
        190,
        'rgba(19,64,44,0.70)',
        52,
        73
    );

    /*
     * Dark foreground forest.
     */

    drawForestLayer(
        915,
        275,
        'rgba(4,30,20,0.97)',
        60,
        137
    );

    /*
     * ========================================================
     * CREATE SKY TEXTURE
     * ========================================================
     */

    const threeSunlightSkyTexture =
        new THREE.CanvasTexture(
            threeSunlightSkyCanvas
        );

    threeSunlightSkyTexture.colorSpace =
        THREE.SRGBColorSpace;

    threeSunlightSkyTexture.needsUpdate =
        true;

    /*
     * IMPORTANT:
     * This is the final sky background.
     */

    scene.background =
        threeSunlightSkyTexture;

    /*
     * ========================================================
     * FOREST ATMOSPHERE
     * ========================================================
     */

    scene.fog =
        new THREE.Fog(
            0x123b2c,
            700,
            3200
        );

    /*
     * ========================================================
     * BLUE SKY LIGHT
     * ========================================================
     */

    const threeSunlightSkyLight =
        new THREE.HemisphereLight(
            0x8fcaff,
            0x123d28,
            1.65
        );

    threeSunlightSkyLight.name =
        'ThreeSunlight_BlueForest_SkyLight';

    scene.add(
        threeSunlightSkyLight
    );

    /*
     * ========================================================
     * WARM GOLDEN SUNLIGHT
     * ========================================================
     */

    const threeSunlightSun =
        new THREE.DirectionalLight(
            0xffefc2,
            3.1
        );

    threeSunlightSun.name =
        'ThreeSunlight_WarmSun';

    threeSunlightSun.position.set(
        700,
        1100,
        -500
    );

    threeSunlightSun.castShadow =
        false;

    scene.add(
        threeSunlightSun
    );

    /*
     * ========================================================
     * FOREST GREEN FILL
     * ========================================================
     */

    const threeSunlightForestFill =
        new THREE.DirectionalLight(
            0x367957,
            0.52
        );

    threeSunlightForestFill.name =
        'ThreeSunlight_ForestFill';

    threeSunlightForestFill.position.set(
        -500,
        350,
        800
    );

    threeSunlightForestFill.castShadow =
        false;

    scene.add(
        threeSunlightForestFill
    );

    /*
     * ========================================================
     * SOFT AMBIENT FILL
     * ========================================================
     */

    const threeSunlightAmbient =
        new THREE.AmbientLight(
            0x285f49,
            0.40
        );

    threeSunlightAmbient.name =
        'ThreeSunlight_ForestAmbient';

    scene.add(
        threeSunlightAmbient
    );

    scene.userData =
        scene.userData || {};

    scene.userData.threeSunlightTheme =
        'BLUE_SUNLIT_DARK_FOREST_UNIVERSE';

    console.log(
        'Three Sunlight: BLUE SUNLIT DARK FOREST SKY ACTIVE'
    );

})();

/* THREE SUNLIGHT - BLUE SUNLIT FOREST UNIVERSE THEME END */



    /* BLUE SUNLIT FOREST SKY IS INSTALLED AFTER RENDERER INITIALIZATION */

    camera =
        new THREE.PerspectiveCamera(

            60,

            window.innerWidth /
            window.innerHeight,

            0.1,

            10000

        );

    camera.position.set(
        60,
        8,
        0
    );

    camera.lookAt(
        -60,
        8,
        0
    );

    scene.add(
        camera
    );

    renderer =
        new THREE.WebGPURenderer({

            antialias: true

        });

    renderer.library.addLight(
        SunLightNode,
        SunLight
    );

    renderer.setPixelRatio(
        Math.min(
            window.devicePixelRatio,
            2
        )
    );

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

    renderer.shadowMap.enabled =
        true;

    renderer.toneMapping =
        THREE.ACESFilmicToneMapping;

    renderer.toneMappingExposure =
        0.7;

    renderer.inspector =
        new Inspector();

    document
        .getElementById(
            'container'
        )
        .appendChild(
            renderer.domElement
        );

    controls =
        new FirstPersonControls(
            camera,
            renderer.domElement
        );

    controls.movementSpeed =
        40;

    controls.lookSpeed =
        0.2;

    timer =
        new THREE.Timer();

    // ========================================================
    // SUNLIGHT
    // ========================================================

    sunLight =
        new SunLight();

    sunLight.castShadow =
        true;

    sunLight.shadow.camera.far =
        params.far;

    sunLight.shadow.mapSize.setScalar(
        params.resolution
    );

    sunLight.shadow.normalBias =
        0.05;

    scene.add(
        sunLight
    );

    await renderer.init();

    // GROUND
    // ========================================================

    // ========================================================
    // AVENUE POSTS
    // ========================================================

    const dummy =
        new THREE.Object3D();

    const posts =
        new THREE.InstancedMesh(

            new THREE.BoxGeometry(
                1,
                10,
                1
            ),

            new THREE.MeshStandardMaterial({

                color: 0x475161

            }),

            120

        );

    posts.castShadow =
        true;

    posts.receiveShadow =
        true;

    scene.add(
        posts
    );

    for (
        let i = 0;
        i < 60;
        i++
    ) {

        for (
            const side of [-1, 1]
        ) {

            dummy.position.set(

                30 -
                i * 17,

                5,

                side * 13

            );

            dummy.scale.set(
                1,
                1,
                1
            );

            dummy.updateMatrix();

            posts.setMatrixAt(

                i * 2 +
                (side + 1) / 2,

                dummy.matrix

            );
        }
    }
    const sunGui =
        renderer.inspector
            .createParameters(
                'Sun Light'
            );

    sunGui
        .add(
            params,
            'far',
            100,
            3000
        )
        .step(1)
        .name(
            'shadow far'
        )
        .onChange(
            function(value) {

                sunLight
                    .shadow
                    .camera
                    .far =
                    value;

            }
        );

    sunGui
        .add(
            params,
            'resolution',
            [
                256,
                512,
                1024,
                2048,
                4096
            ]
        )
        .name(
            'shadow resolution'
        )
        .onChange(
            function(value) {

                sunLight
                    .shadow
                    .mapSize
                    .setScalar(
                        value
                    );

            }
        );

    sunGui
        .add(
            params,
            'azimuth',
            0,
            360
        )
        .name(
            'azimuth'
        )
        .onChange(
            updateSun
        );

    sunGui
        .add(
            params,
            'elevation',
            5,
            80
        )
        .name(
            'elevation'
        )
        .onChange(
            updateSun
        );

    updateSun();

    // ========================================================
    // RESIZE
    // ========================================================

    window.addEventListener(
        'resize',
        function() {

            camera.aspect =
                window.innerWidth /
                window.innerHeight;

            camera.updateProjectionMatrix();

            renderer.setSize(

                window.innerWidth,

                window.innerHeight

            );

            controls.handleResize();

        }
    );

/*
 * THREE_SUNLIGHT_HIGH_PERFORMANCE_CITY_HOOK
 *
 * This hook is intentionally tiny.
 * It does not replace the existing render loop.
 */
try {

    if (
        typeof globalThis.__THREE_SUNLIGHT_HIGH_PERFORMANCE_TICK__ ===
        'function'
    ) {

        const __tsOriginalAnimate =
            typeof animate === 'function'
                ? animate
                : null;

        if (
            __tsOriginalAnimate &&
            !globalThis.__THREE_SUNLIGHT_ANIMATE_WRAPPED__
        ) {

            globalThis.__THREE_SUNLIGHT_ANIMATE_WRAPPED__ = true;

            globalThis.__THREE_SUNLIGHT_ORIGINAL_ANIMATE__ =
                __tsOriginalAnimate;

            animate = function(...args) {

                const __tsNow =
                    performance.now();

                const __tsLast =
                    globalThis.__THREE_SUNLIGHT_LAST_FRAME_TIME__ ||
                    __tsNow;

                const __tsDelta =
                    Math.min(
                        0.1,
                        Math.max(
                            0.001,
                            (__tsNow - __tsLast) /
                            1000
                        )
                    );

                globalThis.__THREE_SUNLIGHT_LAST_FRAME_TIME__ =
                    __tsNow;

                try {

                    globalThis.__THREE_SUNLIGHT_HIGH_PERFORMANCE_TICK__(
                        __tsNow,
                        __tsDelta
                    );

                }
                catch (error) {

                    console.warn(
                        '[ThreeSunlight] Performance hook error:',
                        error
                    );

                }

                return __tsOriginalAnimate.apply(
                    this,
                    args
                );

            };

        }

    }

}
catch (error) {

    console.warn(
        '[ThreeSunlight] Could not install animation hook:',
        error
    );

}

renderer.setAnimationLoop(
        animate
    );
}

// ============================================================
// COMPILED CITY SOLID COLLISION
// ============================================================
//
// Buildings are treated as rectangular solid volumes.
// No physics engine is required.
//
// The collision system only checks nearby grid cells,
// which keeps 4,809 buildings inexpensive to handle.
// ============================================================

const COMPILED_CITY_COLLISION_ENABLED =
    true;

const COMPILED_CITY_COLLISION_RADIUS =
    1.35;

const COMPILED_CITY_COLLISION_VERTICAL_MARGIN =
    0.25;

function compiledCityResolveBuildingCollision(
    previousX,
    previousY,
    previousZ
) {
    if (
        !COMPILED_CITY_COLLISION_ENABLED ||
        !compiledCityBuildings ||
        compiledCityBuildings.length === 0
    ) {
        return;
    }

    /*
     * Only perform building collision when the camera
     * is vertically inside the building volume.
     *
     * The buildings begin at y = 0.
     */
    const cameraBottom =
        camera.position.y -
        COMPILED_CITY_COLLISION_VERTICAL_MARGIN;

    const cameraTop =
        camera.position.y +
        COMPILED_CITY_COLLISION_VERTICAL_MARGIN;

    /*
     * If the camera is below the city or above all
     * building roofs, there is no wall collision.
     */
    if (
        cameraTop < 0
    ) {
        return;
    }

    /*
     * Convert the camera position to approximate grid
     * coordinates.
     *
     * The city uses:
     *
     *   columns = COMPILED_CITY_GRID_COLUMNS
     *   spacing = COMPILED_CITY_GRID_SPACING
     */
    const spacing =
        COMPILED_CITY_GRID_SPACING;

    const columns =
        COMPILED_CITY_GRID_COLUMNS;

    const approximateColumn =
        Math.round(
            (
                camera.position.x /
                spacing
            ) +
            (
                columns - 1
            ) / 2
        );

    const approximateRow =
        Math.round(
            (
                camera.position.z /
                spacing
            ) +
            Math.floor(
                compiledCityBuildings.length /
                columns
            ) / 2
        );

    /*
     * Camera movement at speed 40 is still only a small
     * distance per frame, so checking a small neighborhood
     * around the current cell is sufficient.
     */
    const gridSearchRadius =
        2;

    const minColumn =
        Math.max(
            0,
            approximateColumn -
            gridSearchRadius
        );

    const maxColumn =
        Math.min(
            columns - 1,
            approximateColumn +
            gridSearchRadius
        );

    const minRow =
        Math.max(
            0,
            approximateRow -
            gridSearchRadius
        );

    const maxRow =
        Math.min(
            Math.ceil(
                compiledCityBuildings.length /
                columns
            ) - 1,
            approximateRow +
            gridSearchRadius
        );

    /*
     * Resolve each nearby building.
     *
     * We use the camera's previous position to determine
     * which side of the building the player approached from.
     * This allows natural sliding along walls.
     */
    for (
        let row = minRow;
        row <= maxRow;
        row++
    ) {
        for (
            let column = minColumn;
            column <= maxColumn;
            column++
        ) {
            const index =
                row *
                columns +
                column;

            if (
                index < 0 ||
                index >= compiledCityBuildings.length
            ) {
                continue;
            }

            const building =
                compiledCityBuildings[index];

            if (
                !building
            ) {
                continue;
            }

            const halfWidth =
                (
                    building.width /
                    2
                ) +
                COMPILED_CITY_COLLISION_RADIUS;

            const halfDepth =
                (
                    building.depth /
                    2
                ) +
                COMPILED_CITY_COLLISION_RADIUS;

            const minX =
                building.x -
                halfWidth;

            const maxX =
                building.x +
                halfWidth;

            const minZ =
                building.z -
                halfDepth;

            const maxZ =
                building.z +
                halfDepth;

            const currentX =
                camera.position.x;

            const currentZ =
                camera.position.z;

            /*
             * Is the camera currently inside the
             * expanded building rectangle?
             */
            if (
                currentX <= minX ||
                currentX >= maxX ||
                currentZ <= minZ ||
                currentZ >= maxZ
            ) {
                continue;
            }

            /*
             * Find the penetration distance to each wall.
             */
            const pushLeft =
                currentX -
                minX;

            const pushRight =
                maxX -
                currentX;

            const pushFront =
                currentZ -
                minZ;

            const pushBack =
                maxZ -
                currentZ;

            /*
             * Determine the nearest wall.
             */
            const smallestPush =
                Math.min(
                    pushLeft,
                    pushRight,
                    pushFront,
                    pushBack
                );

            /*
             * Prefer the direction that represents the
             * actual incoming movement when possible.
             */
            const movementX =
                camera.position.x -
                previousX;

            const movementZ =
                camera.position.z -
                previousZ;

            if (
                smallestPush === pushLeft
            ) {
                camera.position.x =
                    minX;

            }
            else if (
                smallestPush === pushRight
            ) {
                camera.position.x =
                    maxX;

            }
            else if (
                smallestPush === pushFront
            ) {
                camera.position.z =
                    minZ;

            }
            else {
                camera.position.z =
                    maxZ;
            }
        }
    }

    /*
     * Final safety pass.
     *
     * If collision resolution somehow moved the camera
     * farther than expected, don't allow a large teleport.
     */
    const correctionX =
        camera.position.x -
        previousX;

    const correctionZ =
        camera.position.z -
        previousZ;

    const correctionDistanceSquared =
        (
            correctionX *
            correctionX
        ) +
        (
            correctionZ *
            correctionZ
        );

    const maxCorrection =
        (
            controls.movementSpeed *
            0.25
        );

    if (
        correctionDistanceSquared >
        maxCorrection *
        maxCorrection
    ) {
        camera.position.x =
            previousX;

        camera.position.z =
            previousZ;
    }
}

// ============================================================


/* THREE SUNLIGHT - TARGETED VIBRANT CITY START */

/*
 * ============================================================
 * TARGETED VIBRANT BUILDING COLOR SYSTEM
 * ============================================================
 *
 * IMPORTANT:
 *
 * This system does NOT create a second city.
 *
 * It operates on the existing:
 *
 *     CompiledCityBuildingsInstanced
 *
 * InstancedMesh.
 *
 * Existing:
 *
 *   - building geometry
 *   - building transforms
 *   - building positions
 *   - facade anchors
 *   - facade CanvasTextures
 *   - lazy facade activation
 *   - collision
 *   - WebGPU renderer
 *   - camera
 *   - SunLight
 *
 * remain untouched.
 *
 * The only visual modification is per-instance color.
 * ============================================================
 */

const THREE_SUNLIGHT_TARGETED_VIBRANT_COLORS = [
    0xff1744,
    0xff3d00,
    0xff6d00,
    0xff9100,
    0xffb300,
    0xffd600,
    0xfdd835,
    0x76ff03,
    0x00e676,
    0x00e5ff,
    0x00b8d4,
    0x00b0ff,
    0x2979ff,
    0x304ffe,
    0x651fff,
    0x7c4dff,
    0xd500f9,
    0xf50057,
    0xff4081,
    0x18ffff,
    0x64ffda,
    0x1de9b6
];


/*
 * Deterministic hash.
 *
 * The same building index always receives the same color.
 */
function threeSunlightTargetedVibrantHash(
    value
) {

    let x =
        Number(value) || 0;

    x =
        Math.sin(
            x * 12.9898
        ) *
        43758.5453;

    return (
        x -
        Math.floor(x)
    );
}


/*
 * Get deterministic vibrant color.
 */
function threeSunlightTargetedVibrantColor(
    index
) {

    const safeIndex =
        Number.isFinite(
            Number(index)
        )
            ? Number(index)
            : 0;

    const hash =
        threeSunlightTargetedVibrantHash(
            safeIndex + 17321
        );

    const paletteIndex =
        Math.floor(
            hash *
            THREE_SUNLIGHT_TARGETED_VIBRANT_COLORS.length
        ) %
        THREE_SUNLIGHT_TARGETED_VIBRANT_COLORS.length;

    return new THREE.Color(
        THREE_SUNLIGHT_TARGETED_VIBRANT_COLORS[
            paletteIndex
        ]
    );
}


/*
 * Apply vibrant colors to the EXISTING city InstancedMesh.
 *
 * The mesh is discovered by its existing name:
 *
 *     CompiledCityBuildingsInstanced
 *
 * This avoids relying on a local variable inside
 * compiledCityCreateBuildings().
 */
function threeSunlightApplyTargetedVibrantColors() {

    if (
        typeof scene === 'undefined' ||
        !scene
    ) {
        return 0;
    }


    const buildingMesh =
        scene.getObjectByName(
            'CompiledCityBuildingsInstanced'
        );


    if (
        !buildingMesh ||
        !buildingMesh.isInstancedMesh
    ) {
        return 0;
    }


    const material =
        buildingMesh.material;


    /*
     * Enable instance colors on the EXISTING shared material.
     */
    if (
        material
    ) {

        material.vertexColors =
            true;

        /*
         * Keep the base material bright enough that
         * instance colors remain highly visible.
         */
        if (
            material.color
        ) {

            material.color.setHex(
                0xffffff
            );
        }


        /*
         * A small neutral emissive contribution prevents
         * buildings from becoming nearly black in shadow.
         */
        if (
            material.emissive
        ) {

            material.emissive.setHex(
                0x101820
            );

            material.emissiveIntensity =
                0.18;
        }


        if (
            'roughness' in material
        ) {

            material.roughness =
                0.54;
        }


        if (
            'metalness' in material
        ) {

            material.metalness =
                0.18;
        }


        material.needsUpdate =
            true;
    }


    /*
     * Assign a color to every existing instance.
     *
     * No new meshes are created.
     */
    const count =
        Number(
            buildingMesh.count
        ) || 0;


    if (
        count <= 0
    ) {
        return 0;
    }


    for (
        let index = 0;
        index < count;
        index++
    ) {

        buildingMesh.setColorAt(
            index,
            threeSunlightTargetedVibrantColor(
                index
            )
        );
    }


    if (
        buildingMesh.instanceColor
    ) {

        buildingMesh.instanceColor.needsUpdate =
            true;
    }


    buildingMesh.needsUpdate =
        true;


    buildingMesh.userData =
        buildingMesh.userData || {};


    buildingMesh.userData.threeSunlightTargetedVibrant =
        true;


    buildingMesh.userData.threeSunlightVibrantInstanceCount =
        count;


    return count;
}


/*
 * ============================================================
 * LAZY DISCOVERY
 * ============================================================
 *
 * The existing city is created asynchronously after the module
 * initializes and loads compiled-city.json.
 *
 * Therefore this patch waits for the EXISTING InstancedMesh.
 *
 * It does not create anything while waiting.
 * ============================================================
 */

let threeSunlightTargetedVibrantAttempts =
    0;

let threeSunlightTargetedVibrantApplied =
    false;


function threeSunlightTargetedVibrantWaitForCity() {

    threeSunlightTargetedVibrantAttempts++;


    try {

        const count =
            threeSunlightApplyTargetedVibrantColors();


        if (
            count > 0
        ) {

            threeSunlightTargetedVibrantApplied =
                true;


            console.log(
                '[VibrantCity] Existing InstancedMesh upgraded:',
                count,
                'building instances.'
            );


            return;
        }

    }
    catch (
        error
    ) {

        console.warn(
            '[VibrantCity] Color application attempt failed:',
            error
        );
    }


    /*
     * Keep waiting while the existing application loads
     * its city.
     */
    if (
        threeSunlightTargetedVibrantAttempts <
        300
    ) {

        window.setTimeout(
            threeSunlightTargetedVibrantWaitForCity,
            250
        );

    }
    else {

        console.warn(
            '[VibrantCity] Existing CompiledCityBuildingsInstanced was not found.'
        );
    }
}


/*
 * Public diagnostic / refresh helper.
 *
 * This is useful after the existing city renderer has rebuilt
 * its InstancedMesh.
 */
window.threeSunlightRefreshVibrantCity =
    function () {

        return threeSunlightApplyTargetedVibrantColors();
    };


/*
 * Start the discovery process.
 */
window.setTimeout(
    threeSunlightTargetedVibrantWaitForCity,
    500
);


/* THREE SUNLIGHT - TARGETED VIBRANT CITY END */

// ANIMATION
// ============================================================

function animate() {

    compiledCityUpdateFacades();

    compiledCityUpdateFacadeSides();
    if (
        typeof animatedFacades !== 'undefined' &&
        animatedFacades
    ) {

        const facadeElapsed =
            typeof clock !== 'undefined'
                ? clock.getElapsedTime()
                : performance.now() * 0.001;

        animatedFacades.update(
            facadeElapsed
        );
    }

    if (
        typeof animatedFacades !== 'undefined' &&
        animatedFacades
    ) {

        const facadeElapsed =
            typeof clock !== 'undefined'
                ? clock.getElapsedTime()
                : performance.now() * 0.001;

        animatedFacades.update(
            facadeElapsed
        );
    }

    timer.update();

    /*
     * Save the camera position before FirstPersonControls
     * moves it. Collision uses this position to resolve
     * the attempted movement against building walls.
     */
    const previousCameraX =
        camera.position.x;

    const previousCameraY =
        camera.position.y;

    const previousCameraZ =
        camera.position.z;

    controls.update(
        timer.getDelta()
    );

    /*
     * Buildings are solid.
     *
     * The camera may move freely in open space, but
     * cannot enter a building's rectangular volume.
     */
    compiledCityResolveBuildingCollision(
        previousCameraX,
        previousCameraY,
        previousCameraZ
    );

    threeSunlightProtectGround();

threeSunlightClampCameraToSceneBoundary();

renderer.render(
        scene,
        camera
    );

}

init();

// === COMPILED_DISPLAY_TEST_START ===

/*
 * ============================================================
 * COMPILED TEXT CITY - HIGH CONTRAST DISPLAY TEST
 * ============================================================
 *
 * Every active building gets:
 *
 *     unique canvas
 *          +
 *     unique CanvasTexture
 *          +
 *     unique material
 *          +
 *     unique facade
 *
 * No active building shares another building's texture.
 */

const compiledCityConfig = {

    dataUrl: '/data/compiled-city.json',

    buildingCount: 0,

    gridColumns: 76,

    spacing: 22,

    minHeight: 14,

    maxHeight: 55,

    buildingSizeMin: 8,

    buildingSizeMax: 13,

    activeRadius: 220,

    releaseRadius: 280,

    maxActiveFacades: 48,

    canvasWidth: 1024,

    canvasHeight: 300
};

// ============================================================
// ===== BEGIN COMPILED CITY DISPLAY SYSTEM =====
// ============================================================
//
// DIRECT BUILDING FACADE VERSION
//
// Every active display is attached to:
//
//     compiledCityBuildingAnchor
//              |
//              +---- facade Mesh
//                       |
//                       +---- unique CanvasTexture
//
// ============================================================
const COMPILED_CITY_DATA_URL = '/data/compiled-city.json';

const COMPILED_CITY_ACTIVE_RADIUS = 220;
const COMPILED_CITY_RELEASE_RADIUS = 280;
const COMPILED_CITY_MAX_ACTIVE_FACADES = 48;
const COMPILED_CITY_GRID_SPACING = 22;

const COMPILED_CITY_GRID_COLUMNS = 76;
const COMPILED_CITY_SPACING = 22;

const COMPILED_CITY_BUILDING_COLORS = [
    0x00d9ff,
    0xff1744,
    0x00ff9d,
    0xff00d9,
    0x7c4dff,
    0xffea00,
    0x00e5ff,
    0xff6d00
];

let compiledCitySections = [];

let compiledCityBuildings = [];

let compiledCityBuildingGroup = null;

let compiledCityFacadeGroup = null;

let compiledCityActiveFacades = new Map();

let compiledCitySharedBuildingGeometry = null;

let compiledCityDataReady = false;

let compiledCityLastUpdate = 0;
/* ============================================================
   FIXED FOUR-SIDED NEWSREEL SETTINGS

   These values control ONLY the text display surface.

   They do NOT change building dimensions.
   ============================================================ */


const COMPILED_CITY_NEWSREEL_SPEED =
    30;

const COMPILED_CITY_NEWSREEL_LINE_HEIGHT =
    24;

const COMPILED_CITY_NEWSREEL_SIDE_OFFSETS =
    [
        0,
        0.25,
        0.50,
        0.75
    ];

let compiledCityNewsreelStarted =
    false;

let compiledCityNewsreelLastTime = 0;

const COMPILED_CITY_NEWSREEL_CANVAS_WIDTH = 1024;

const COMPILED_CITY_NEWSREEL_CANVAS_HEIGHT = 512;

let compiledCityLastSideUpdate = 0;

// ============================================================
// CREATE UNIQUE CANVAS TEXTURE
// ============================================================


/* THREE SUNLIGHT - COMPILED CITY COMPACT BUILDING SETTINGS */

const COMPILED_CITY_BUILDING_WIDTH_SCALE = 0.60;
const COMPILED_CITY_BUILDING_DEPTH_SCALE = 0.60;
const COMPILED_CITY_BUILDING_HEIGHT_SCALE = 0.55;

const COMPILED_CITY_TEXT_VISIBLE_LINES = 10;
const COMPILED_CITY_TEXT_LINE_HEIGHT = 38;

const COMPILED_CITY_TEXT_BORDER_TOP = 130;
const COMPILED_CITY_TEXT_BORDER_BOTTOM = 130;
const COMPILED_CITY_TEXT_BORDER_LEFT = 130;
const COMPILED_CITY_TEXT_BORDER_RIGHT = 130;

const COMPILED_CITY_TEXT_AREA_WIDTH = 880;

const COMPILED_CITY_TEXT_AREA_HEIGHT =
    COMPILED_CITY_TEXT_VISIBLE_LINES *
    COMPILED_CITY_TEXT_LINE_HEIGHT;

const COMPILED_CITY_FIXED_FACE_WIDTH =
    COMPILED_CITY_TEXT_AREA_WIDTH +
    COMPILED_CITY_TEXT_BORDER_LEFT +
    COMPILED_CITY_TEXT_BORDER_RIGHT;

const COMPILED_CITY_FIXED_FACE_HEIGHT =
    COMPILED_CITY_TEXT_AREA_HEIGHT +
    COMPILED_CITY_TEXT_BORDER_TOP +
    COMPILED_CITY_TEXT_BORDER_BOTTOM;

/* END THREE SUNLIGHT - COMPILED CITY COMPACT BUILDING SETTINGS */

function compiledCityCreateUniqueDisplay(
    sectionIndex,
    sectionText,
    sideIndex = 0
) {

    const canvas =
        document.createElement(
            'canvas'
        );

    canvas.width =
        COMPILED_CITY_FIXED_FACE_WIDTH;

    canvas.height =
        COMPILED_CITY_FIXED_FACE_HEIGHT;

    const context =
        canvas.getContext(
            '2d'
        );

    /*
     * Background.
     */

    context.fillStyle =
        '#080b10';

    context.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    /*
     * Thick structural border.
     */

    context.fillStyle =
        '#171d25';

    context.fillRect(
        0,
        0,
        canvas.width,
        COMPILED_CITY_TEXT_BORDER_TOP
    );

    context.fillRect(
        0,
        canvas.height -
        COMPILED_CITY_TEXT_BORDER_BOTTOM,
        canvas.width,
        COMPILED_CITY_TEXT_BORDER_BOTTOM
    );

    context.fillRect(
        0,
        0,
        COMPILED_CITY_TEXT_BORDER_LEFT,
        canvas.height
    );

    context.fillRect(
        canvas.width -
        COMPILED_CITY_TEXT_BORDER_RIGHT,
        0,
        COMPILED_CITY_TEXT_BORDER_RIGHT,
        canvas.height
    );

    /*
     * Inner text window.
     */

    const textX =
        COMPILED_CITY_TEXT_BORDER_LEFT;

    const textY =
        COMPILED_CITY_TEXT_BORDER_TOP;

    const textWidth =
        COMPILED_CITY_TEXT_AREA_WIDTH;

    const textHeight =
        COMPILED_CITY_TEXT_AREA_HEIGHT;

    /*
     * Fixed text-window background.
     */

    context.fillStyle =
        '#05070a';

    context.fillRect(
        textX,
        textY,
        textWidth,
        textHeight
    );

    /*
     * Prepare text.
     */

    const cleanText =
        String(
            sectionText || ''
        )
        .replace(
            /\s+/g,
            ' '
        )
        .trim();

    context.font =
        'bold 32px Arial';

    context.textBaseline =
        'top';

    const words =
        cleanText.split(
            ' '
        );

    const lines = [];

    let currentLine = '';

    for (
        const word of words
    ) {

        const testLine =
            currentLine
                ? `${currentLine} ${word}`
                : word;

        const width =
            context.measureText(
                testLine
            ).width;

        if (
            width >
            textWidth - 36
        ) {

            if (currentLine) {
                lines.push(
                    currentLine
                );
            }

            currentLine =
                word;

        } else {

            currentLine =
                testLine;
        }
    }

    if (currentLine) {
        lines.push(
            currentLine
        );
    }

    /*
     * Newsreel state.
     */

    const totalTextHeight =
        lines.length *
        COMPILED_CITY_TEXT_LINE_HEIGHT;

    const maxScroll =
        Math.max(
            0,
            totalTextHeight -
            textHeight
        );

    let texture = null;

    function drawNewsreel(timestamp) {

        const seconds =
            timestamp / 1000;

        /*
         * Continuous movement.
         * Once the end is reached, restart cleanly.
         */

        const travel =
            maxScroll > 0
                ? (
                    seconds *
                    COMPILED_CITY_NEWSREEL_SPEED
                  ) %
                  (
                    maxScroll +
                    textHeight
                  )
                : 0;

        context.save();

        /*
         * Clear only the text window.
         */

        context.fillStyle =
            '#05070a';

        context.fillRect(
            textX,
            textY,
            textWidth,
            textHeight
        );

        /*
         * Clip to the fixed ten-line display area.
         */

        context.beginPath();

        context.rect(
            textX,
            textY,
            textWidth,
            textHeight
        );

        context.clip();

        /*
         * Draw scrolling lines.
         */

        context.font =
            'bold 32px Arial';

        context.textBaseline =
            'top';

        context.fillStyle =
            '#ffffff';

        for (
            let i = 0;
            i < lines.length;
            i++
        ) {

            const y =
                textY +
                i *
                COMPILED_CITY_TEXT_LINE_HEIGHT -
                travel;

            if (
                y >
                    textY -
                    COMPILED_CITY_TEXT_LINE_HEIGHT &&
                y <
                    textY +
                    textHeight
            ) {

                context.fillText(
                    lines[i],
                    textX + 18,
                    y
                );
            }
        }

        context.restore();

        /*
         * The canvas is continuously changing because
         * the newsreel scrolls. Tell Three.js/WebGPU
         * that the CanvasTexture needs a fresh upload.
         */
        if (texture) {
            texture.needsUpdate = true;
        }

        /*
         * Re-draw the structural border so
         * scrolling text can NEVER cover it.
         */

        context.fillStyle =
            '#171d25';

        context.fillRect(
            0,
            0,
            canvas.width,
            COMPILED_CITY_TEXT_BORDER_TOP
        );

        context.fillRect(
            0,
            canvas.height -
            COMPILED_CITY_TEXT_BORDER_BOTTOM,
            canvas.width,
            COMPILED_CITY_TEXT_BORDER_BOTTOM
        );

        context.fillRect(
            0,
            0,
            COMPILED_CITY_TEXT_BORDER_LEFT,
            canvas.height
        );

        context.fillRect(
            canvas.width -
            COMPILED_CITY_TEXT_BORDER_RIGHT,
            0,
            COMPILED_CITY_TEXT_BORDER_RIGHT,
            canvas.height
        );

        /*
         * Small section identifier inside
         * the structural header.
         */

        context.fillStyle =
            '#8d99a8';

        context.font =
            'bold 18px Arial';

        context.textBaseline =
            'middle';

        context.fillText(
            `SECTION ${sectionIndex + 1}`,
            COMPILED_CITY_TEXT_BORDER_LEFT + 18,
            COMPILED_CITY_TEXT_BORDER_TOP / 2
        );

        /*
         * Side indicator.
         */

        const sideNames = [
            'FRONT',
            'BACK',
            'LEFT',
            'RIGHT'
        ];

        context.textAlign =
            'right';

        context.fillText(
            sideNames[
                sideIndex % 4
            ],
            canvas.width -
            COMPILED_CITY_TEXT_BORDER_RIGHT -
            18,
            COMPILED_CITY_TEXT_BORDER_TOP / 2
        );

        context.textAlign =
            'left';

        /*
         * Bottom structural label.
         */

        context.fillStyle =
            '#65707d';

        context.textAlign = 'center';

        context.textBaseline = 'middle';

        context.font =
            'bold 16px Arial';

        context.fillStyle =
            '#ffffff';

        context.fillText(
            'Ehtesham K . Absolute Motivation',
            canvas.width / 2,
            canvas.height -
            COMPILED_CITY_TEXT_BORDER_BOTTOM / 2
        );

        context.textAlign = 'left';

        canvas.userData =
            canvas.userData || {};

        canvas.userData.drawNewsreel =
            drawNewsreel;

        canvas.userData.sectionIndex =
            sectionIndex;

        canvas.userData.sideIndex =
            sideIndex;

        canvas.userData.lineCount =
            lines.length;

        canvas.userData.visibleLines =
            COMPILED_CITY_TEXT_VISIBLE_LINES;
    }

    /*
     * Initial frame.
     */

    drawNewsreel(
        performance.now()
    );

    /*
     * Create the actual Three.js texture from the
     * HTML canvas used by the scrolling display.
     *
     * This was previously missing, while the facade
     * material expected display.texture.
     */
    texture =
        new THREE.CanvasTexture(
            canvas
        );

    texture.colorSpace =
        THREE.SRGBColorSpace;

    texture.needsUpdate =
        true;

    return {
        canvas,
        context,
        texture,
        drawNewsreel
    };
}

// ============================================================
// BUILDING MATERIAL
// ============================================================

function compiledCityCreateBuildingMaterial(
    colorValue
) {

    return new THREE.MeshStandardMaterial({

        color:
            colorValue,

        emissive:
            colorValue,

        emissiveIntensity:
            0.12,

        roughness:
            0.72,

        metalness:
            0.28
    });
}

// ============================================================
// CREATE BUILDINGS
// ============================================================

function compiledCityCreateBuildings() {

    if (
        !compiledCitySections ||
        compiledCitySections.length === 0
    ) {
        return;
    }

    /*
     * ========================================================
     * COMPACT BUILDING DIMENSIONS
     * ========================================================
     *
     * The city grid spacing is 22 units.
     *
     * Buildings therefore must remain substantially smaller
     * than one grid cell.
     *
     * Intended building dimensions:
     *
     *     width  = 9.6
     *     depth  = 9.6
     *     height = 23.1
     *
     * The old instanced implementation incorrectly created:
     *
     *     684 x 352 x 684
     *
     * and then used instance scale 1,1,1.
     *
     * That caused the buildings to overlap enormous portions
     * of the city and made them appear as one giant object.
     */

    const buildingWidth =
        9.6;

    const buildingDepth =
        9.6;

    const buildingHeight =
        23.1;

    /*
     * ========================================================
     * ONE UNIT SHARED GEOMETRY
     * ========================================================
     *
     * Every instance receives its real dimensions through
     * its instance matrix.
     *
     * This keeps ONE geometry shared by all 4,809 buildings.
     */

    const sharedBuildingGeometry =
        new THREE.BoxGeometry(
            1,
            1,
            1
        );

    const sharedBuildingMaterial =
        new THREE.MeshStandardMaterial({
            color: 0x20252b,
            roughness: 0.78,
            metalness: 0.08
        });

    const totalBuildings =
        compiledCitySections.length;

    const instancedBuildings =
        new THREE.InstancedMesh(
            sharedBuildingGeometry,
            sharedBuildingMaterial,
            totalBuildings
        );

    instancedBuildings.name =
        "CompiledCityBuildingsInstanced";

    const dummy =
        new THREE.Object3D();

    compiledCityBuildings = [];

    for (
        let index = 0;
        index < totalBuildings;
        index++
    ) {

        /*
         * ====================================================
         * GRID POSITION
         * ====================================================
         */

        const column =
            index %
            COMPILED_CITY_GRID_COLUMNS;

        const row =
            Math.floor(
                index /
                COMPILED_CITY_GRID_COLUMNS
            );

        const x =
            (
                column -
                (COMPILED_CITY_GRID_COLUMNS - 1) / 2
            ) *
            COMPILED_CITY_GRID_SPACING;

        const z =
            (
                row -
                Math.floor(
                    totalBuildings /
                    COMPILED_CITY_GRID_COLUMNS
                ) / 2
            ) *
            COMPILED_CITY_GRID_SPACING;

        /*
         * ====================================================
         * INSTANCE TRANSFORM
         * ====================================================
         *
         * BoxGeometry is centered around its origin.
         *
         * Scaling:
         *
         *     X = 9.6
         *     Y = 23.1
         *     Z = 9.6
         *
         * Translation:
         *
         *     X = building center
         *     Y = half building height
         *     Z = building center
         *
         * Therefore the building bottom remains exactly at
         * world Y = 0.
         */

        dummy.position.set(
            x,
            buildingHeight / 2,
            z
        );

        dummy.rotation.set(
            0,
            0,
            0
        );

        dummy.scale.set(
            buildingWidth,
            buildingHeight,
            buildingDepth
        );

        dummy.updateMatrix();

        instancedBuildings.setMatrixAt(
            index,
            dummy.matrix
        );

        /*
         * ====================================================
         * BUILDING ANCHOR
         * ====================================================
         *
         * Keep the existing anchor architecture intact.
         *
         * Facades are attached to these anchors rather than
         * directly to the InstancedMesh.
         */

        const anchor =
            new THREE.Group();

        anchor.position.set(
            x,
            0,
            z
        );

        scene.add(
            anchor
        );

        /*
         * ====================================================
         * BUILDING RECORD
         * ====================================================
         *
         * IMPORTANT:
         *
         * width/depth/height exactly match the rendered
         * instance dimensions.
         *
         * Collision uses these values.
         *
         * Facade placement also uses these values.
         */

        const building = {
            index,
            instanceId: index,

            x,
            y: 0,
            z,

            mesh:
                instancedBuildings,

            anchor,

            width:
                buildingWidth,

            depth:
                buildingDepth,

            height:
                buildingHeight,

            facade:
                null,

            facades:
                [],

            texture:
                null,

            canvas:
                null,

            context:
                null,

            material:
                sharedBuildingMaterial,

            geometry:
                sharedBuildingGeometry,

            facadeMaterials:
                [],

            facadeTextures:
                [],

            facadeCanvases:
                [],

            facadeContexts:
                [],

            facadeGeometries:
                []
        };

        compiledCityBuildings.push(
            building
        );
    }

    /*
     * Tell Three.js that all instance transforms are ready.
     */

    instancedBuildings.instanceMatrix.needsUpdate =
        true;

    /*
     * Rebuild the InstancedMesh bounds from the actual
     * transformed instances.
     */

    instancedBuildings.computeBoundingBox();
    instancedBuildings.computeBoundingSphere();

    /*
     * Add exactly one shared building mesh to the scene.
     */

    
scene.add(
        instancedBuildings
    );


    threeSunlightCreateCinematicGroundAndMaterials();
threeSunlightCreateSceneBoundary();
}

// ============================================================
// FIND CLOSEST BUILDING SIDE
// ============================================================

function compiledCityGetNearestFacade(
    building
) {

    const localX =
        camera.position.x -
        building.x;

    const localZ =
        camera.position.z -
        building.z;

    const absX =
        Math.abs(localX);

    const absZ =
        Math.abs(localZ);

    if (
        absX > absZ
    ) {

        if (
            localX >= 0
        ) {

            return 'right';
        }

        return 'left';
    }

    if (
        localZ >= 0
    ) {

        return 'back';
    }

    return 'front';
}

// ============================================================
// PLACE PANEL ON REAL BUILDING SURFACE
// ============================================================

function compiledCityPlaceFacade(
    facade,
    building,
    facadeName
) {

    const panelWidth =
        Math.max(
            building.width * 0.82,
            8
        );

    const panelHeight =
        Math.max(
            Math.min(
                building.height * 0.46,
                28
            ),
            7
        );

    facade.scale.set(
        panelWidth,
        panelHeight,
        1
    );

    const tinyGap =
        0.08;

    if (
        facadeName === 'front'
    ) {

        facade.position.set(
            0,
            building.height * 0.58,
            -(
                building.depth / 2
            ) - tinyGap
        );

        facade.rotation.set(
            0,
            0,
            0
        );
    }

    else if (
        facadeName === 'back'
    ) {

        facade.position.set(
            0,
            building.height * 0.58,
            (
                building.depth / 2
            ) + tinyGap
        );

        facade.rotation.set(
            0,
            Math.PI,
            0
        );
    }

    else if (
        facadeName === 'left'
    ) {

        facade.position.set(
            -(
                building.width / 2
            ) - tinyGap,
            building.height * 0.58,
            0
        );

        facade.rotation.set(
            0,
            -Math.PI / 2,
            0
        );
    }

    else if (
        facadeName === 'right'
    ) {

        facade.position.set(
            (
                building.width / 2
            ) + tinyGap,
            building.height * 0.58,
            0
        );

        facade.rotation.set(
            0,
            Math.PI / 2,
            0
        );
    }

    facade.userData.facadeName =
        facadeName;
}

// ============================================================
// ACTIVATE UNIQUE DISPLAY
// ============================================================

/* ============================================================
   FIXED FOUR-SIDED NEWSREEL ANIMATION
   ============================================================ */

function compiledCityStartNewsreelAnimation() {

    if (
        compiledCityNewsreelStarted
    ) {

        return;
    }

    compiledCityNewsreelStarted =
        true;

    const tick =
        (
            timestamp
        ) => {

            if (
                typeof compiledCityActiveFacades !==
                'undefined'
            ) {

                compiledCityActiveFacades.forEach(
                    (
                        active
                    ) => {

                        if (
                            !active ||
                            !active.canvases
                        ) {

                            return;
                        }

                        active.canvases.forEach(
                            (
                                canvas
                            ) => {

                                if (
                                    canvas &&
                                    canvas.userData &&
                                    typeof canvas.userData.drawNewsreel ===
                                        'function'
                                ) {

                                    canvas.userData.drawNewsreel(
                                        timestamp
                                    );
                                }
                            }
                        );
                    }
                );
            }

            requestAnimationFrame(
                tick
            );
        };

    requestAnimationFrame(
        tick
    );
}
function compiledCityActivateFacade(
    building
) {

    if (
        compiledCityActiveFacades.has(
            building.index
        )
    ) {

        return;
    }

    const sectionText =
        compiledCitySections[
            building.index
        ];

    if (
        !sectionText
    ) {

        return;
    }

    // ========================================================
    // FOUR SIDES
    // ========================================================

    const sideNames =
        [
            'front',
            'back',
            'left',
            'right'
        ];

    const facades =
        [];

    const displays =
        [];

    const materials =
        [];

    const geometries =
        [];

    for (
        let sideIndex = 0;
        sideIndex < 4;
        sideIndex++
    ) {

        // ====================================================
        // SAME CANVAS SIZE ON EVERY SIDE
        // ====================================================

        const display =
            compiledCityCreateUniqueDisplay(
                building.index,
                sectionText,
                sideIndex
            );

        const material =
            new THREE.MeshBasicMaterial({

                map:
                    display.texture,

                color:
                    0xffffff,

                transparent:
                    false,

                opacity:
                    1,

                depthWrite:
                    false,

                depthTest:
                    true,

                toneMapped:
                    false,

                side:
                    THREE.FrontSide
            });

        // ====================================================
        // FIXED DISPLAY GEOMETRY
        //
        // NEVER based on section length.
        // ====================================================

        const geometry =
            new THREE.PlaneGeometry(
                1,
                1
            );

        const facade =
            new THREE.Mesh(
                geometry,
                material
            );

        facade.name =
            `CompiledCityFacade_${building.index}_${sideNames[sideIndex]}`;

        facade.renderOrder =
            1000;
        building.anchor.add(
            facade
        );

        // ====================================================
        // EXISTING CITY PLACEMENT SYSTEM
        // ====================================================

        compiledCityPlaceFacade(
            facade,
            building,
            sideNames[sideIndex]
        );

        facade.userData.buildingIndex =
            building.index;

        facade.userData.facadeSide =
            sideNames[sideIndex];

        facade.userData.sectionText =
            sectionText;

        facade.userData.uniqueDisplay =
            true;

        facade.userData.uniqueTexture =
            display.texture;

        facade.userData.canvas =
            display.canvas;

        facade.userData.context =
            display.context;

        facades.push(
            facade
        );

        displays.push(
            display
        );

        materials.push(
            material
        );

        geometries.push(
            geometry
        );
    }

    // ========================================================
    // ACTIVE RECORD
    //
    // Keep singular fields for compatibility with the
    // existing cleanup code, while also retaining all four.
    // ========================================================

    compiledCityActiveFacades.set(
        building.index,
        {
            building:
                building,

            facade:
                facades[0],

            facades:
                facades,

            texture:
                displays[0].texture,

            textures:
                displays.map(
                    display =>
                        display.texture
                ),

            canvas:
                displays[0].canvas,

            canvases:
                displays.map(
                    display =>
                        display.canvas
                ),

            context:
                displays[0].context,

            contexts:
                displays.map(
                    display =>
                        display.context
                ),

            material:
                materials[0],

            materials:
                materials,

            geometry:
                geometries[0],

            geometries:
                geometries,

            facadeName:
                'four-sided'
        }
    );

    console.log(
        `[Compiled City] FIXED FOUR-SIDED NEWSREEL -> Section ${building.index + 1}`
    );
}

// ============================================================
// DEACTIVATE DISPLAY
// ============================================================

function compiledCityDeactivateFacade(
    buildingIndex
) {

    const active =
        compiledCityActiveFacades.get(
            buildingIndex
        );

    if (
        !active
    ) {

        return;
    }

    const facade =
        active.facade;

    if (
        facade.parent
    ) {

        facade.parent.remove(
            facade
        );
    }

    if (
        active.geometry
    ) {

        active.geometry.dispose();
    }

    if (
        active.material
    ) {

        if (
            active.material.map
        ) {

            active.material.map.dispose();
        }

        active.material.dispose();
    }

    compiledCityActiveFacades.delete(
        buildingIndex
    );
}

// ============================================================
// LAZY LOADING
// ============================================================

function compiledCityUpdateFacades(
    force = false
) {

    if (
        !compiledCityDataReady
    ) {
        return;
    }

    const now =
        performance.now();

    if (
        !force &&
        (
            now -
            compiledCityLastUpdate
        ) < 150
    ) {
        return;
    }

    compiledCityLastUpdate =
        now;

    /*
     * ========================================================
     * GRID-AWARE SEARCH
     * ========================================================
     *
     * The city is a regular grid.
     *
     * There is no reason to calculate and sort the distance
     * to all 4,809 buildings every update.
     *
     * We calculate the camera's grid cell and inspect only
     * nearby cells.
     */

    const columns =
        COMPILED_CITY_GRID_COLUMNS;

    const spacing =
        COMPILED_CITY_GRID_SPACING;

    const totalBuildings =
        compiledCityBuildings.length;

    const totalRows =
        Math.ceil(
            totalBuildings /
            columns
        );

    const column =
        Math.round(
            (
                camera.position.x /
                spacing
            ) +
            (
                columns - 1
            ) / 2
        );

    const row =
        Math.round(
            (
                camera.position.z /
                spacing
            ) +
            Math.floor(
                totalBuildings /
                columns
            ) / 2
        );

    /*
     * The active radius is 220.
     *
     * At 22 units of grid spacing, this is roughly
     * ten cells in every direction.
     *
     * We use a small safety margin so buildings near
     * the edge of the active radius are not missed.
     */
    const cellRadius =
        Math.ceil(
            COMPILED_CITY_ACTIVE_RADIUS /
            spacing
        ) + 1;

    const minColumn =
        Math.max(
            0,
            column -
            cellRadius
        );

    const maxColumn =
        Math.min(
            columns - 1,
            column +
            cellRadius
        );

    const minRow =
        Math.max(
            0,
            row -
            cellRadius
        );

    const maxRow =
        Math.min(
            totalRows - 1,
            row +
            cellRadius
        );

    /*
     * Only nearby buildings become candidates.
     */
    const candidates = [];

    for (
        let candidateRow = minRow;
        candidateRow <= maxRow;
        candidateRow++
    ) {

        for (
            let candidateColumn = minColumn;
            candidateColumn <= maxColumn;
            candidateColumn++
        ) {

            const index =
                candidateRow *
                columns +
                candidateColumn;

            if (
                index < 0 ||
                index >= totalBuildings
            ) {
                continue;
            }

            const building =
                compiledCityBuildings[index];

            if (
                !building
            ) {
                continue;
            }

            const dx =
                camera.position.x -
                building.x;

            const dz =
                camera.position.z -
                building.z;

            const distanceSquared =
                (
                    dx * dx
                ) +
                (
                    dz * dz
                );

            if (
                distanceSquared <=
                (
                    COMPILED_CITY_ACTIVE_RADIUS *
                    COMPILED_CITY_ACTIVE_RADIUS
                )
            ) {

                candidates.push({
                    building,
                    distanceSquared
                });
            }
        }
    }

    /*
     * Sort only the nearby candidates.
     *
     * This is dramatically cheaper than sorting all
     * 4,809 buildings.
     */
    candidates.sort(
        (
            a,
            b
        ) =>
            a.distanceSquared -
            b.distanceSquared
    );

    /*
     * Desired buildings.
     *
     * Preserve the existing configured maximum.
     */
    const desired =
        new Set();

    for (
        const candidate
        of candidates
    ) {

        if (
            desired.size >=
            COMPILED_CITY_MAX_ACTIVE_FACADES
        ) {
            break;
        }

        desired.add(
            candidate.building.index
        );
    }

    /*
     * Activate only buildings that are actually desired.
     */
    for (
        const index
        of desired
    ) {

        if (
            !compiledCityActiveFacades.has(
                index
            )
        ) {

            const building =
                compiledCityBuildings[
                    index
                ];

            compiledCityActivateFacade(
                building
            );
        }
    }

    /*
     * Release buildings that have moved outside the
     * release radius.
     */
    const releaseRadiusSquared =
        COMPILED_CITY_RELEASE_RADIUS *
        COMPILED_CITY_RELEASE_RADIUS;

    for (
        const [
            index,
            active
        ]
        of compiledCityActiveFacades
    ) {

        const building =
            active.building;

        const dx =
            camera.position.x -
            building.x;

        const dz =
            camera.position.z -
            building.z;

        const distanceSquared =
            (
                dx * dx
            ) +
            (
                dz * dz
            );

        if (
            distanceSquared >
            releaseRadiusSquared
        ) {

            compiledCityDeactivateFacade(
                index
            );
        }
    }
}
// ============================================================
// CHANGE ACTIVE FACADE SIDE
// ============================================================

function compiledCityUpdateFacadeSides() {

    if (
        !compiledCityDataReady
    ) {

        return;
    }

    const now =
        performance.now();

    if (
        (
            now -
            compiledCityLastSideUpdate
        ) < 250
    ) {

        return;
    }

    compiledCityLastSideUpdate =
        now;

    for (
        const [
            index,
            active
        ]
        of compiledCityActiveFacades
    ) {

        const building =
            active.building;

        const desiredFacade =
            compiledCityGetNearestFacade(
                building
            );

        if (
            desiredFacade !==
            active.facadeName
        ) {

            active.facadeName =
                desiredFacade;

            compiledCityPlaceFacade(
                active.facade,
                building,
                desiredFacade
            );
        }
    }
}

// ============================================================
// LOAD DATA
// ============================================================

async function compiledCityLoadData() {

    const response =
        await fetch(
            COMPILED_CITY_DATA_URL,
            {
                cache:
                    'no-store'
            }
        );

    if (
        !response.ok
    ) {

        throw new Error(
            `Unable to load ${COMPILED_CITY_DATA_URL}: ${response.status}`
        );
    }

    const data =
        await response.json();

    compiledCitySections =
        Array.isArray(data)
            ? data.map(
                item =>
                    typeof item === 'string'
                        ? item
                        : item.text
            )
            : [];

    console.log(
        `[Compiled City] Sections loaded: ${compiledCitySections.length}`
    );

    compiledCityCreateBuildings();

    compiledCityStartNewsreelAnimation();

    compiledCityDataReady =
        true;

    compiledCityUpdateFacades(
        true
    );

    console.log(
        `[Compiled City] Active facades: ${compiledCityActiveFacades.size}`
    );
}

// ============================================================
// DEBUG API
// ============================================================

window.compiledCityDebug = {
    inspectBuilding(index = 0) {
        const building =
            compiledCityBuildings[index];

        if (!building) {
            return {
                error: `Building ${index} does not exist.`,
                buildingCount: compiledCityBuildings.length
            };
        }

        const mesh =
            building.mesh;

        const geometry =
            mesh?.geometry;

        const material =
            mesh?.material;

        return {
            index: building.index,

            position: {
                x: building.x,
                y: building.y,
                z: building.z
            },

            dimensions: {
                width: building.width,
                depth: building.depth,
                height: building.height
            },

            buildingKeys:
                Object.keys(building),

            mesh: {
                exists: !!mesh,
                type: mesh?.type ?? null,
                uuid: mesh?.uuid ?? null,
                visible: mesh?.visible ?? null,
                position: mesh
                    ? {
                        x: mesh.position.x,
                        y: mesh.position.y,
                        z: mesh.position.z
                    }
                    : null
            },

            geometry: {
                exists: !!geometry,
                type: geometry?.type ?? null,
                uuid: geometry?.uuid ?? null,
                attributes: geometry
                    ? Object.keys(geometry.attributes)
                    : [],
                indexCount: geometry?.index
                    ? geometry.index.count
                    : 0
            },

            material: {
                exists: !!material,
                type: material?.type ?? null,
                uuid: material?.uuid ?? null,
                color: material?.color
                    ? material.color.getHex()
                    : null,
                roughness: material?.roughness ?? null,
                metalness: material?.metalness ?? null
            },

            anchor: {
                exists: !!building.anchor,
                type: building.anchor?.type ?? null,
                uuid: building.anchor?.uuid ?? null,
                children:
                    building.anchor?.children?.length ?? 0
            },

            facades: {
                facadeCount:
                    building.facades?.length ?? 0,

                materialCount:
                    building.facadeMaterials?.length ?? 0,

                textureCount:
                    building.facadeTextures?.length ?? 0,

                canvasCount:
                    building.facadeCanvases?.length ?? 0,

                contextCount:
                    building.facadeContexts?.length ?? 0,

                geometryCount:
                    building.facadeGeometries?.length ?? 0
            }
        };
    },

    inspectBuildingSharing(sampleCount = 10) {
        const count =
            Math.min(
                Math.max(1, sampleCount),
                compiledCityBuildings.length
            );

        const samples = [];

        for (let index = 0; index < count; index++) {
            const building =
                compiledCityBuildings[index];

            samples.push({
                index: building.index,

                meshUUID:
                    building.mesh?.uuid ?? null,

                geometryUUID:
                    building.mesh?.geometry?.uuid ?? null,

                materialUUID:
                    building.mesh?.material?.uuid ?? null,

                anchorUUID:
                    building.anchor?.uuid ?? null,

                facadeCount:
                    building.facades?.length ?? 0,

                facadeGeometryCount:
                    building.facadeGeometries?.length ?? 0,

                facadeMaterialCount:
                    building.facadeMaterials?.length ?? 0,

                facadeTextureCount:
                    building.facadeTextures?.length ?? 0
            });
        }

        const geometryUUIDs =
            new Set(
                samples
                    .map(item => item.geometryUUID)
                    .filter(Boolean)
            );

        const materialUUIDs =
            new Set(
                samples
                    .map(item => item.materialUUID)
                    .filter(Boolean)
            );

        const meshUUIDs =
            new Set(
                samples
                    .map(item => item.meshUUID)
                    .filter(Boolean)
            );

        const anchorUUIDs =
            new Set(
                samples
                    .map(item => item.anchorUUID)
                    .filter(Boolean)
            );

        return {
            totalBuildings:
                compiledCityBuildings.length,

            sampleCount:
                samples.length,

            uniqueMeshUUIDs:
                meshUUIDs.size,

            uniqueGeometryUUIDs:
                geometryUUIDs.size,

            uniqueMaterialUUIDs:
                materialUUIDs.size,

            uniqueAnchorUUIDs:
                anchorUUIDs.size,

            samples
        };
    },

    sections() {

        return compiledCitySections.length;
    },

    buildings() {

        return compiledCityBuildings.length;
    },

    activeFacades() {

        return compiledCityActiveFacades.size;
    },

    uniqueTextures() {

        const textures =
            new Set();

        for (
            const active
            of compiledCityActiveFacades.values()
        ) {

            textures.add(
                active.texture.uuid
            );
        }

        return textures.size;
    },

    activeSectionNumbers() {

        return Array.from(
            compiledCityActiveFacades.keys()
        )
            .sort(
                (
                    a,
                    b
                ) =>
                    a - b
            )
            .map(
                index =>
                    index + 1
            );
    },

    section(index) {

        return compiledCitySections[
            index
        ];
    },

    building(index) {

        return compiledCityBuildings[
            index
        ];
    },

    facadeInfo(index) {

        const active =
            compiledCityActiveFacades.get(
                index
            );

        if (
            !active
        ) {

            return null;
        }

        return {

            buildingIndex:
                index,

            sectionNumber:
                index + 1,

            facade:
                active.facadeName,

            textureUUID:
                active.texture.uuid,

            textureIsUnique:
                true,

            attachedToBuildingAnchor:
                active.facade.parent ===
                active.building.anchor,

            position: {

                x:
                    active.facade.position.x,

                y:
                    active.facade.position.y,

                z:
                    active.facade.position.z
            }
        };
    },

    config() {

        return {

            activeRadius:
                COMPILED_CITY_ACTIVE_RADIUS,

            releaseRadius:
                COMPILED_CITY_RELEASE_RADIUS,

            maxActiveFacades:
                COMPILED_CITY_MAX_ACTIVE_FACADES
        };
    },
    rendererInfo() {
        return {
            render: {
                calls: renderer.info.render.calls,
                triangles: renderer.info.render.triangles,
                points: renderer.info.render.points,
                lines: renderer.info.render.lines
            },
            memory: {
                geometries: renderer.info.memory.geometries,
                textures: renderer.info.memory.textures
            },
            programs: renderer.info.programs
                ? renderer.info.programs.length
                : null
        };
    },

    sceneChildren() {
        return scene.children.length;
    },
    inspectSceneObjects() {
        const objects = [];

        scene.children.forEach(
            (object, index) => {
                const geometry =
                    object.geometry ?? null;

                const material =
                    object.material ?? null;

                let dimensions = null;

                if (geometry) {
                    if (!geometry.boundingBox) {
                        geometry.computeBoundingBox();
                    }

                    const box =
                        geometry.boundingBox;

                    if (box) {
                        dimensions = {
                            width:
                                box.max.x -
                                box.min.x,

                            height:
                                box.max.y -
                                box.min.y,

                            depth:
                                box.max.z -
                                box.min.z
                        };
                    }
                }

                let materialInfo = null;

                if (Array.isArray(material)) {
                    materialInfo =
                        material.map(
                            item => ({
                                type:
                                    item?.type ??
                                    null,

                                uuid:
                                    item?.uuid ??
                                    null,

                                color:
                                    item?.color
                                        ? item.color.getHex()
                                        : null,

                                roughness:
                                    item?.roughness ??
                                    null,

                                metalness:
                                    item?.metalness ??
                                    null,

                                opacity:
                                    item?.opacity ??
                                    null,

                                transparent:
                                    item?.transparent ??
                                    null
                            })
                        );
                } else {
                    materialInfo = {
                        type:
                            material?.type ??
                            null,

                        uuid:
                            material?.uuid ??
                            null,

                        color:
                            material?.color
                                ? material.color.getHex()
                                : null,

                        roughness:
                            material?.roughness ??
                            null,

                        metalness:
                            material?.metalness ??
                            null,

                        opacity:
                            material?.opacity ??
                            null,

                        transparent:
                            material?.transparent ??
                            null
                    };
                }

                objects.push({
                    sceneIndex:
                        index,

                    name:
                        object.name ||
                        "",

                    type:
                        object.type,

                    uuid:
                        object.uuid,

                    visible:
                        object.visible,

                    position: {
                        x:
                            object.position.x,

                        y:
                            object.position.y,

                        z:
                            object.position.z
                    },

                    rotation: {
                        x:
                            object.rotation.x,

                        y:
                            object.rotation.y,

                        z:
                            object.rotation.z
                    },

                    scale: {
                        x:
                            object.scale.x,

                        y:
                            object.scale.y,

                        z:
                            object.scale.z
                    },

                    geometry: {
                        exists:
                            !!geometry,

                        type:
                            geometry?.type ??
                            null,

                        uuid:
                            geometry?.uuid ??
                            null
                    },

                    material:
                        materialInfo,

                    dimensions,

                    children:
                        object.children?.length ??
                        0,

                    userDataKeys:
                        Object.keys(
                            object.userData ?? {}
                        )
                });
            }
        );

        return {
            sceneChildren:
                scene.children.length,

            topLevelObjects:
                objects.length,

            objects
        };
    },

    cameraPosition() {
        return {
            x: camera.position.x,
            y: camera.position.y,
            z: camera.position.z
        };
    },

    cameraDirection() {
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);

        return {
            x: direction.x,
            y: direction.y,
            z: direction.z
        };
    },

    controlsInfo() {
        return {
            type: controls?.constructor?.name ?? null,
            movementSpeed: controls?.movementSpeed ?? null,
            lookSpeed: controls?.lookSpeed ?? null,
            enabled: controls?.enabled ?? null
        };
    },

    setControlsEnabled(enabled) {
        controls.enabled = Boolean(enabled);

        return {
            enabled: controls.enabled
        };
    },

    inspectControls() {
        return {
            keys: Object.keys(controls),
            values: Object.fromEntries(
                Object.keys(controls)
                    .filter(key => {
                        const value = controls[key];
                        return (
                            typeof value === "number" ||
                            typeof value === "boolean" ||
                            typeof value === "string"
                        );
                    })
                    .map(key => [key, controls[key]])
            )
        };
    },

    lookAtBuilding(index) {
        const building = compiledCityBuildings[index];

        if (!building) {
            return {
                error: "Building not found",
                index
            };
        }

        camera.position.set(60, 8, 0);

        const target = new THREE.Vector3(
            building.x,
            building.y,
            building.z
        );

        camera.lookAt(target);

        return {
            index,
            camera: {
                x: camera.position.x,
                y: camera.position.y,
                z: camera.position.z
            },
            target: {
                x: target.x,
                y: target.y,
                z: target.z
            },
            distance: camera.position.distanceTo(target)
        };
    },

    resetCamera() {
        camera.position.set(
            60,
            8,
            0
        );

        camera.lookAt(
            -60,
            8,
            0
        );

        return {
            x: camera.position.x,
            y: camera.position.y,
            z: camera.position.z
        };
    },

    buildingPosition(index) {

        const building =
            compiledCityBuildings[index];

        if (!building) {
            return null;
        }

        const dx =
            camera.position.x -
            building.x;

        const dz =
            camera.position.z -
            building.z;

        const distanceSquared =
            (dx * dx) +
            (dz * dz);

        return {

            index:
                building.index,

            stored: {
                x: building.x,
                y: building.y,
                z: building.z
            },

            anchor: {
                x: building.anchor.position.x,
                y: building.anchor.position.y,
                z: building.anchor.position.z
            },

            camera: {
                x: camera.position.x,
                y: camera.position.y,
                z: camera.position.z
            },

            distance:
                Math.sqrt(
                    distanceSquared
                ),

            activeRadius:
                COMPILED_CITY_ACTIVE_RADIUS,

            withinActiveRadius:
                distanceSquared <=
                (
                    COMPILED_CITY_ACTIVE_RADIUS *
                    COMPILED_CITY_ACTIVE_RADIUS
                )
        };
    },
};

// ============================================================
// START DATA LOADING
// ============================================================

compiledCityLoadData()
    .catch(
        error => {

            console.error(
                '[Compiled City] Failed to initialize:',
                error
            );
        }
    );

// ===== END COMPILED CITY DISPLAY SYSTEM =====

/* THREE_SUNLIGHT_HIGH_PERFORMANCE_CITY_START */

/*
 * ============================================================
 * THREE SUNLIGHT
 * HIGH PERFORMANCE CITY CONTROLLER
 * ============================================================
 *
 * This controller intentionally sits above the existing city
 * renderer.
 *
 * It does NOT:
 *
 *   - create another city
 *   - load another JSON file
 *   - replace InstancedMesh
 *   - replace the facade system
 *   - replace the camera
 *   - replace the renderer
 *
 * It only governs existing spatial city objects.
 *
 * ============================================================
 */


/* ------------------------------------------------------------
 * PERFORMANCE CONSTANTS
 * ------------------------------------------------------------ */

const THREE_SUNLIGHT_HP_STARTUP_RADIUS =
    105;

const THREE_SUNLIGHT_HP_ACTIVE_RADIUS =
    145;

const THREE_SUNLIGHT_HP_RELEASE_RADIUS =
    175;

const THREE_SUNLIGHT_HP_GOVERNOR_INTERVAL =
    120;

const THREE_SUNLIGHT_HP_LABEL_RADIUS =
    125;

const THREE_SUNLIGHT_HP_LABEL_INTERVAL =
    180;

const THREE_SUNLIGHT_HP_MAX_LABELS =
    24;

const THREE_SUNLIGHT_HP_MAX_VISIBILITY_CHECKS =
    24;

const THREE_SUNLIGHT_HP_CHUNK_BATCH =
    2;

const THREE_SUNLIGHT_HP_PIXEL_RATIO =
    1.25;


/* ------------------------------------------------------------
 * INTERNAL STATE
 * ------------------------------------------------------------ */

let threeSunlightHpLastGovernor =
    0;

let threeSunlightHpLastLabels =
    0;

let threeSunlightHpVisibilityCursor =
    0;

let threeSunlightHpChunkList =
    null;

let threeSunlightHpLabels =
    [];

let threeSunlightHpLabelGeometry =
    null;

let threeSunlightHpLabelMaterial =
    null;

let threeSunlightHpLabelCanvas =
    null;

let threeSunlightHpLabelTexture =
    null;

let threeSunlightHpLabelContext =
    null;

let threeSunlightHpLabelTextureReady =
    false;

let threeSunlightHpInitialized =
    false;


/* ------------------------------------------------------------
 * RENDERER QUALITY GOVERNOR
 * ------------------------------------------------------------ */

function threeSunlightHpTuneRenderer() {

    try {

        if (
            typeof renderer ===
            'undefined' ||
            !renderer
        ) {
            return;
        }

        if (
            typeof window !==
            'undefined' &&
            window.devicePixelRatio
        ) {

            const desiredPixelRatio =
                Math.min(
                    window.devicePixelRatio,
                    THREE_SUNLIGHT_HP_PIXEL_RATIO
                );

            if (
                typeof renderer.setPixelRatio ===
                'function'
            ) {

                renderer.setPixelRatio(
                    desiredPixelRatio
                );

            }

        }

    }
    catch (
        error
    ) {

        console.warn(
            '[HighPerformanceCity] Renderer tuning skipped:',
            error
        );

    }

}


/* ------------------------------------------------------------
 * CHUNK DISCOVERY
 * ------------------------------------------------------------ */

function threeSunlightHpDiscoverChunks() {

    if (
        threeSunlightHpChunkList &&
        threeSunlightHpChunkList.length
    ) {

        return threeSunlightHpChunkList;

    }

    if (
        typeof compiledCityBuildingGroup ===
        'undefined' ||
        !compiledCityBuildingGroup
    ) {

        return [];

    }

    const discovered =
        [];

    try {

        compiledCityBuildingGroup.traverse(
            object => {

                if (
                    !object
                ) {

                    return;

                }

                if (
                    object.isInstancedMesh
                ) {

                    discovered.push(
                        object
                    );

                }

            }
        );

    }
    catch (
        error
    ) {

        console.warn(
            '[HighPerformanceCity] Chunk discovery failed:',
            error
        );

        return [];

    }

    threeSunlightHpChunkList =
        discovered;

    return discovered;

}


/* ------------------------------------------------------------
 * OBJECT WORLD POSITION
 * ------------------------------------------------------------ */

function threeSunlightHpGetObjectPosition(
    object,
    target
) {

    if (
        !object ||
        !target
    ) {

        return false;

    }

    try {

        object.getWorldPosition(
            target
        );

        return (
            Number.isFinite(
                target.x
            ) &&
            Number.isFinite(
                target.y
            ) &&
            Number.isFinite(
                target.z
            )
        );

    }
    catch (
        error
    ) {

        return false;

    }

}


/* ------------------------------------------------------------
 * CHUNK DISTANCE
 * ------------------------------------------------------------ */

function threeSunlightHpDistanceToCamera(
    object
) {

    if (
        typeof camera ===
        'undefined' ||
        !camera ||
        !object
    ) {

        return Infinity;

    }

    const position =
        new THREE.Vector3();

    if (
        !threeSunlightHpGetObjectPosition(
            object,
            position
        )
    ) {

        return Infinity;

    }

    return position.distanceTo(
        camera.position
    );

}


/* ------------------------------------------------------------
 * LAZY CHUNK GOVERNOR
 * ------------------------------------------------------------ */

function threeSunlightHpUpdateChunkVisibility() {

    const now =
        performance.now();

    if (
        now -
        threeSunlightHpLastGovernor <
        THREE_SUNLIGHT_HP_GOVERNOR_INTERVAL
    ) {

        return;

    }

    threeSunlightHpLastGovernor =
        now;

    const chunks =
        threeSunlightHpDiscoverChunks();

    if (
        !chunks.length
    ) {

        return;

    }

    if (
        typeof camera ===
        'undefined' ||
        !camera
    ) {

        return;

    }

    /*
     * Process only a small number of chunks per update.
     *
     * This prevents traversing thousands of buildings
     * every animation frame.
     */

    const count =
        Math.min(
            THREE_SUNLIGHT_HP_MAX_VISIBILITY_CHECKS,
            chunks.length
        );

    for (
        let i = 0;
        i < count;
        i++
    ) {

        const index =
            (
                threeSunlightHpVisibilityCursor +
                i
            ) %
            chunks.length;

        const chunk =
            chunks[index];

        if (
            !chunk
        ) {

            continue;

        }

        /*
         * Preserve the original state the first time
         * this controller sees the chunk.
         */

        if (
            !chunk.userData
        ) {

            chunk.userData =
                {};

        }

        if (
            typeof chunk.userData
                .threeSunlightHpOriginalVisible ===
            'undefined'
        ) {

            chunk.userData
                .threeSunlightHpOriginalVisible =
                chunk.visible !== false;

        }

        const distance =
            threeSunlightHpDistanceToCamera(
                chunk
            );

        /*
         * Close:
         * always allow it to render.
         */

        if (
            distance <=
            THREE_SUNLIGHT_HP_ACTIVE_RADIUS
        ) {

            chunk.visible =
                true;

            continue;

        }

        /*
         * Medium distance:
         * keep visible, but let the existing lazy system
         * decide if it wants to remove it.
         */

        if (
            distance <=
            THREE_SUNLIGHT_HP_RELEASE_RADIUS
        ) {

            if (
                chunk.userData
                    .threeSunlightHpOriginalVisible
            ) {

                chunk.visible =
                    true;

            }

            continue;

        }

        /*
         * Far distance:
         * release from rendering.
         */

        chunk.visible =
            false;

    }

    threeSunlightHpVisibilityCursor =
        (
            threeSunlightHpVisibilityCursor +
            count
        ) %
        chunks.length;

}


/* ------------------------------------------------------------
 * LABEL CANVAS
 * ------------------------------------------------------------ */

function threeSunlightHpCreateLabelCanvas() {

    if (
        threeSunlightHpLabelCanvas
    ) {

        return;

    }

    if (
        typeof document ===
        'undefined'
    ) {

        return;

    }

    threeSunlightHpLabelCanvas =
        document.createElement(
            'canvas'
        );

    threeSunlightHpLabelCanvas.width =
        256;

    threeSunlightHpLabelCanvas.height =
        96;

    threeSunlightHpLabelContext =
        threeSunlightHpLabelCanvas.getContext(
            '2d'
        );

    if (
        !threeSunlightHpLabelContext
    ) {

        return;

    }

    threeSunlightHpLabelTexture =
        new THREE.CanvasTexture(
            threeSunlightHpLabelCanvas
        );

    threeSunlightHpLabelTexture.colorSpace =
        THREE.SRGBColorSpace;

    threeSunlightHpLabelTexture.minFilter =
        THREE.LinearFilter;

    threeSunlightHpLabelTexture.magFilter =
        THREE.LinearFilter;

    threeSunlightHpLabelTexture.generateMipmaps =
        false;

    threeSunlightHpLabelTextureReady =
        true;

}


/* ------------------------------------------------------------
 * LABEL TEXTURE
 * ------------------------------------------------------------ */

function threeSunlightHpDrawLabel(
    number
) {

    if (
        !threeSunlightHpLabelTextureReady ||
        !threeSunlightHpLabelContext
    ) {

        return;

    }

    const context =
        threeSunlightHpLabelContext;

    const width =
        threeSunlightHpLabelCanvas.width;

    const height =
        threeSunlightHpLabelCanvas.height;

    context.clearRect(
        0,
        0,
        width,
        height
    );

    /*
     * Opaque dark backing.
     *
     * This guarantees the building number remains readable
     * against bright building colors.
     */

    context.fillStyle =
        'rgba(4, 8, 16, 0.94)';

    context.fillRect(
        8,
        10,
        width - 16,
        height - 20
    );

    context.strokeStyle =
        'rgba(0, 240, 255, 0.95)';

    context.lineWidth =
        4;

    context.strokeRect(
        10,
        12,
        width - 20,
        height - 24
    );

    context.textAlign =
        'center';

    context.textBaseline =
        'middle';

    context.font =
        'bold 54px Arial, sans-serif';

    context.fillStyle =
        '#00F0FF';

    context.shadowColor =
        '#00F0FF';

    context.shadowBlur =
        12;

    context.fillText(
        String(number),
        width / 2,
        height / 2
    );

    context.shadowBlur =
        0;

    threeSunlightHpLabelTexture.needsUpdate =
        true;

}


/* ------------------------------------------------------------
 * LABEL MATERIAL
 * ------------------------------------------------------------ */

function threeSunlightHpCreateLabelMaterial() {

    if (
        threeSunlightHpLabelMaterial
    ) {

        return threeSunlightHpLabelMaterial;

    }

    if (
        !threeSunlightHpLabelTextureReady
    ) {

        return null;

    }

    threeSunlightHpLabelMaterial =
        new THREE.SpriteMaterial(
            {
                map:
                    threeSunlightHpLabelTexture,

                transparent:
                    true,

                depthWrite:
                    false,

                depthTest:
                    true,

                sizeAttenuation:
                    true,

                toneMapped:
                    false
            }
        );

    return threeSunlightHpLabelMaterial;

}


/* ------------------------------------------------------------
 * LABEL GROUP
 * ------------------------------------------------------------ */

function threeSunlightHpCreateLabelGroup() {

    if (
        typeof scene ===
        'undefined' ||
        !scene
    ) {

        return null;

    }

    let group =
        scene.getObjectByName(
            'ThreeSunlightHighPerformanceBuildingNumbers'
        );

    if (
        group
    ) {

        return group;

    }

    group =
        new THREE.Group();

    group.name =
        'ThreeSunlightHighPerformanceBuildingNumbers';

    group.renderOrder =
        100;

    scene.add(
        group
    );

    return group;

}


/* ------------------------------------------------------------
 * CREATE LABEL
 * ------------------------------------------------------------ */

function threeSunlightHpCreateLabel(
    number,
    position
) {

    const material =
        threeSunlightHpCreateLabelMaterial();

    if (
        !material
    ) {

        return null;

    }

    const group =
        threeSunlightHpCreateLabelGroup();

    if (
        !group
    ) {

        return null;

    }

    const sprite =
        new THREE.Sprite(
            material
        );

    sprite.name =
        'BuildingNumber_' +
        String(number);

    sprite.position.copy(
        position
    );

    /*
     * Large enough to be visible,
     * but deliberately inexpensive.
     */

    sprite.scale.set(
        7,
        2.65,
        1
    );

    sprite.userData =
        {
            threeSunlightHpBuildingNumber:
                number
        };

    group.add(
        sprite
    );

    return sprite;

}


/* ------------------------------------------------------------
 * DISPOSE LABEL
 * ------------------------------------------------------------ */

function threeSunlightHpDisposeLabel(
    sprite
) {

    if (
        !sprite
    ) {

        return;

    }

    if (
        sprite.parent
    ) {

        sprite.parent.remove(
            sprite
        );

    }

    if (
        sprite.material &&
        sprite.material !==
        threeSunlightHpLabelMaterial
    ) {

        sprite.material.dispose();

    }

    sprite.material =
        null;

}


/* ------------------------------------------------------------
 * GET INSTANCE POSITION
 * ------------------------------------------------------------ */

function threeSunlightHpGetInstancePosition(
    mesh,
    instanceIndex,
    target
) {

    if (
        !mesh ||
        !mesh.isInstancedMesh ||
        !mesh.instanceMatrix ||
        !target
    ) {

        return false;

    }

    try {

        const matrix =
            new THREE.Matrix4();

        mesh.getMatrixAt(
            instanceIndex,
            matrix
        );

        const localPosition =
            new THREE.Vector3();

        localPosition.setFromMatrixPosition(
            matrix
        );

        mesh.localToWorld(
            localPosition
        );

        target.copy(
            localPosition
        );

        return true;

    }
    catch (
        error
    ) {

        return false;

    }

}


/* ------------------------------------------------------------
 * FIND NEARBY BUILDINGS
 * ------------------------------------------------------------ */

function threeSunlightHpFindNearbyBuildings() {

    if (
        typeof camera ===
        'undefined' ||
        !camera
    ) {

        return [];

    }

    const chunks =
        threeSunlightHpDiscoverChunks();

    if (
        !chunks.length
    ) {

        return [];

    }

    const candidates =
        [];

    const cameraPosition =
        camera.position;

    let globalBuildingNumber =
        1;

    const maxCandidateChecks =
        500;

    let checked =
        0;

    for (
        const chunk of chunks
    ) {

        if (
            checked >=
            maxCandidateChecks
        ) {

            break;

        }

        if (
            !chunk ||
            !chunk.visible ||
            !chunk.isInstancedMesh
        ) {

            continue;

        }

        const count =
            Math.min(
                Number(
                    chunk.count ||
                    0
                ),
                128
            );

        for (
            let instanceIndex = 0;
            instanceIndex < count;
            instanceIndex++
        ) {

            if (
                checked >=
                maxCandidateChecks
            ) {

                break;

            }

            checked++;

            const position =
                new THREE.Vector3();

            if (
                !threeSunlightHpGetInstancePosition(
                    chunk,
                    instanceIndex,
                    position
                )
            ) {

                continue;

            }

            const distance =
                position.distanceTo(
                    cameraPosition
                );

            if (
                distance <=
                THREE_SUNLIGHT_HP_LABEL_RADIUS
            ) {

                candidates.push(
                    {
                        number:
                            globalBuildingNumber,

                        position:
                            position,

                        distance:
                            distance
                    }
                );

            }

            globalBuildingNumber++;

        }

    }

    candidates.sort(
        (
            a,
            b
        ) =>
            a.distance -
            b.distance
    );

    return candidates.slice(
        0,
        THREE_SUNLIGHT_HP_MAX_LABELS
    );

}


/* ------------------------------------------------------------
 * LABEL GOVERNOR
 * ------------------------------------------------------------ */

function threeSunlightHpUpdateBuildingLabels() {

    const now =
        performance.now();

    if (
        now -
        threeSunlightHpLastLabels <
        THREE_SUNLIGHT_HP_LABEL_INTERVAL
    ) {

        return;

    }

    threeSunlightHpLastLabels =
        now;

    if (
        typeof scene ===
        'undefined' ||
        !scene
    ) {

        return;

    }

    threeSunlightHpCreateLabelCanvas();

    if (
        !threeSunlightHpLabelTextureReady
    ) {

        return;

    }

    threeSunlightHpDrawLabel(
        0
    );

    const candidates =
        threeSunlightHpFindNearbyBuildings();

    const desiredCount =
        Math.min(
            candidates.length,
            THREE_SUNLIGHT_HP_MAX_LABELS
        );

    /*
     * Remove all existing labels.
     *
     * There are at most 24, so this is deliberately bounded.
     */

    for (
        const label of threeSunlightHpLabels
    ) {

        threeSunlightHpDisposeLabel(
            label
        );

    }

    threeSunlightHpLabels =
        [];

    /*
     * Create only the nearest labels.
     */

    for (
        let i = 0;
        i < desiredCount;
        i++
    ) {

        const candidate =
            candidates[i];

        const label =
            threeSunlightHpCreateLabel(
                candidate.number,
                candidate.position
            );

        if (
            label
        ) {

            /*
             * Put the number above the building.
             *
             * The exact Y offset is intentionally modest.
             * It works with a wide range of building heights.
             */

            label.position.y +=
                5;

            threeSunlightHpLabels.push(
                label
            );

        }

    }

}


/* ------------------------------------------------------------
 * FACE LABELS TOWARD CAMERA
 * ------------------------------------------------------------ */

function threeSunlightHpUpdateLabelOrientation() {

    if (
        !threeSunlightHpLabels.length
    ) {

        return;

    }

    if (
        typeof camera ===
        'undefined' ||
        !camera
    ) {

        return;

    }

    for (
        const label of threeSunlightHpLabels
    ) {

        if (
            !label
        ) {

            continue;

        }

        label.quaternion.copy(
            camera.quaternion
        );

    }

}


/* ------------------------------------------------------------
 * INITIALIZATION
 * ------------------------------------------------------------ */

function threeSunlightHpInitialize() {

    if (
        threeSunlightHpInitialized
    ) {

        return;

    }

    threeSunlightHpInitialized =
        true;

    threeSunlightHpTuneRenderer();

    threeSunlightHpCreateLabelCanvas();

    console.log(
        '[HighPerformanceCity] Performance controller initialized.'
    );

    console.log(
        '[HighPerformanceCity] Startup radius:',
        THREE_SUNLIGHT_HP_STARTUP_RADIUS
    );

    console.log(
        '[HighPerformanceCity] Active radius:',
        THREE_SUNLIGHT_HP_ACTIVE_RADIUS
    );

    console.log(
        '[HighPerformanceCity] Release radius:',
        THREE_SUNLIGHT_HP_RELEASE_RADIUS
    );

    console.log(
        '[HighPerformanceCity] Maximum building labels:',
        THREE_SUNLIGHT_HP_MAX_LABELS
    );

}


/* ------------------------------------------------------------
 * MAIN PERFORMANCE LOOP
 * ------------------------------------------------------------ */

function threeSunlightHpTick() {

    try {

        threeSunlightHpInitialize();

        threeSunlightHpUpdateChunkVisibility();

        threeSunlightHpUpdateBuildingLabels();

        threeSunlightHpUpdateLabelOrientation();

    }
    catch (
        error
    ) {

        console.warn(
            '[HighPerformanceCity] Tick skipped:',
            error
        );

    }

}


/* ------------------------------------------------------------
 * CAMERA-DRIVEN INTERVAL
 * ------------------------------------------------------------ */

window.setInterval(
    threeSunlightHpTick,
    100
);


/* ------------------------------------------------------------
 * FIRST START
 * ------------------------------------------------------------ */

window.setTimeout(
    threeSunlightHpTick,
    750
);


/* ------------------------------------------------------------
 * MANUAL DIAGNOSTIC
 * ------------------------------------------------------------ */

window.threeSunlightHighPerformanceCityRefresh =
    function () {

        threeSunlightHpChunkList =
            null;

        threeSunlightHpTick();

        return {
            chunks:
                threeSunlightHpDiscoverChunks().length,

            labels:
                threeSunlightHpLabels.length
        };

    };


/* THREE_SUNLIGHT_HIGH_PERFORMANCE_CITY_END */
