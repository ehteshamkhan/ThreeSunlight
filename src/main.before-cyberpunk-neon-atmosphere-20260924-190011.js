import * as THREE from 'three/webgpu';


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

    resolution: 1024,

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

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.15));

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

    sunLight.castShadow = false;

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

const COMPILED_CITY_ACTIVE_RADIUS = 120;
const COMPILED_CITY_RELEASE_RADIUS = 160;
const COMPILED_CITY_MAX_ACTIVE_FACADES = 6;
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
     * --------------------------------------------------------
     * Building dimensions.
     * --------------------------------------------------------
     */

    const buildingWidth =
        9.6;

    const buildingDepth =
        9.6;

    const buildingHeight =
        23.1;

    /*
     * --------------------------------------------------------
     * Shared geometry.
     *
     * Every spatial InstancedMesh uses this same geometry.
     * --------------------------------------------------------
     */

    const sharedBuildingGeometry =
        new THREE.BoxGeometry(
            1,
            1,
            1
        );

    compiledCitySharedBuildingGeometry =
        sharedBuildingGeometry;

    /*
     * --------------------------------------------------------
     * Lightweight building material.
     *
     * MeshBasicMaterial is intentional here.
     *
     * The city body is no longer spending a PBR lighting
     * calculation on thousands of visible building instances.
     *
     * Vibrant colors are supplied through instanceColor.
     * --------------------------------------------------------
     */

    const sharedBuildingMaterial =
        new THREE.MeshBasicMaterial({
            color:
                0xffffff,

            vertexColors:
                true,

            toneMapped:
                false,

            side:
                THREE.FrontSide
        });

    /*
     * --------------------------------------------------------
     * Root city group.
     * --------------------------------------------------------
     */

    compiledCityBuildingGroup =
        new THREE.Group();

    compiledCityBuildingGroup.name =
        'CompiledCityBuildingGroup';

    compiledCityBuildingGroup.userData =
        compiledCityBuildingGroup.userData || {};

    compiledCityBuildingGroup.userData.threeSunlightTrueSpatialCity =
        true;

    compiledCityBuildingGroup.userData.totalBuildings =
        compiledCitySections.length;

    /*
     * --------------------------------------------------------
     * Spatial settings.
     *
     * Original grid:
     *
     *     76 columns
     *     22 units spacing
     *
     * Six cells per chunk gives roughly:
     *
     *     132 x 132 world units
     *
     * and about:
     *
     *     36 buildings per chunk
     * --------------------------------------------------------
     */

    const chunkCells =
        6;

    const totalBuildings =
        compiledCitySections.length;

    const columns =
        COMPILED_CITY_GRID_COLUMNS;

    const chunkBuckets =
        new Map();

    const dummy =
        new THREE.Object3D();

    compiledCityBuildings =
        [];

    /*
     * --------------------------------------------------------
     * Build lightweight logical records first.
     *
     * The anchors are NOT added to the scene individually.
     *
     * They will live underneath their spatial chunk.
     * --------------------------------------------------------
     */

    for (
        let index = 0;
        index < totalBuildings;
        index++
    ) {

        const column =
            index %
            columns;

        const row =
            Math.floor(
                index /
                columns
            );

        const x =
            (
                column -
                (columns - 1) / 2
            ) *
            COMPILED_CITY_GRID_SPACING;

        const z =
            (
                row -
                Math.floor(
                    totalBuildings /
                    columns
                ) / 2
            ) *
            COMPILED_CITY_GRID_SPACING;

        const chunkColumn =
            Math.floor(
                column /
                chunkCells
            );

        const chunkRow =
            Math.floor(
                row /
                chunkCells
            );

        const chunkKey =
            String(chunkRow) +
            ':' +
            String(chunkColumn);

        const anchor =
            new THREE.Group();

        anchor.name =
            'CompiledCityBuildingAnchor_' +
            String(index);

        anchor.position.set(
            x,
            0,
            z
        );

        const building = {

            index,

            instanceId:
                -1,

            x,

            y:
                0,

            z,

            mesh:
                null,

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
                [],

            chunkKey,

            chunk:
                null
        };

        compiledCityBuildings.push(
            building
        );

        if (
            !chunkBuckets.has(
                chunkKey
            )
        ) {

            chunkBuckets.set(
                chunkKey,
                {
                    row:
                        chunkRow,

                    column:
                        chunkColumn,

                    buildings:
                        []
                }
            );
        }

        chunkBuckets
            .get(chunkKey)
            .buildings
            .push(building);
    }

    /*
     * --------------------------------------------------------
     * Create one InstancedMesh per spatial chunk.
     * --------------------------------------------------------
     */

    const chunkList =
        [];

    for (
        const bucket
        of chunkBuckets.values()
    ) {

        const buildings =
            bucket.buildings;

        if (
            !buildings.length
        ) {
            continue;
        }

        const chunkGroup =
            new THREE.Group();

        chunkGroup.name =
            'CompiledCitySpatialChunk_' +
            String(bucket.row) +
            '_' +
            String(bucket.column);

        chunkGroup.visible =
            false;

        chunkGroup.userData =
            chunkGroup.userData || {};

        chunkGroup.userData.threeSunlightSpatialChunk =
            true;

        chunkGroup.userData.cityChunkRow =
            bucket.row;

        chunkGroup.userData.cityChunkColumn =
            bucket.column;

        chunkGroup.userData.buildingIndices =
            [];

        chunkGroup.userData.cityChunkActive =
            false;

        let centerX =
            0;

        let centerZ =
            0;

        /*
         * ----------------------------------------------------
         * One InstancedMesh for this spatial region.
         * ----------------------------------------------------
         */

        const chunkMesh =
            new THREE.InstancedMesh(
                sharedBuildingGeometry,
                sharedBuildingMaterial,
                buildings.length
            );

        /*
         * The first chunk deliberately retains the historical
         * mesh name so the existing vibrant-color patch can
         * still discover a valid InstancedMesh.
         */

        if (
            chunkList.length === 0
        ) {

            chunkMesh.name =
                'CompiledCityBuildingsInstanced';

        }
        else {

            chunkMesh.name =
                'CompiledCityBuildingsInstancedChunk_' +
                String(bucket.row) +
                '_' +
                String(bucket.column);
        }

        /*
         * Shadows are intentionally disabled on the city body.
         *
         * This removes a major GPU cost.
         */

        chunkMesh.castShadow =
            false;

        chunkMesh.receiveShadow =
            false;

        chunkMesh.frustumCulled =
            true;

        /*
         * ----------------------------------------------------
         * Fill instance transforms.
         * ----------------------------------------------------
         */

        for (
            let localIndex = 0;
            localIndex < buildings.length;
            localIndex++
        ) {

            const building =
                buildings[localIndex];

            dummy.position.set(
                building.x,
                buildingHeight / 2,
                building.z
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

            chunkMesh.setMatrixAt(
                localIndex,
                dummy.matrix
            );

            /*
             * ------------------------------------------------
             * Vibrant deterministic color.
             *
             * The existing color function is a declaration and
             * is available when this function executes.
             * ------------------------------------------------
             */

            let buildingColor;

            if (
                typeof threeSunlightTargetedVibrantColor ===
                'function'
            ) {

                buildingColor =
                    threeSunlightTargetedVibrantColor(
                        building.index
                    );

            }
            else {

                const fallbackPalette =
                    [
                        0xff1744,
                        0xff6d00,
                        0xffd600,
                        0x00e676,
                        0x00e5ff,
                        0x2979ff,
                        0x7c4dff,
                        0xf50057
                    ];

                buildingColor =
                    new THREE.Color(
                        fallbackPalette[
                            building.index %
                            fallbackPalette.length
                        ]
                    );
            }

            chunkMesh.setColorAt(
                localIndex,
                buildingColor
            );

            building.mesh =
                chunkMesh;

            building.instanceId =
                localIndex;

            building.chunk =
                chunkGroup;

            chunkGroup.userData
                .buildingIndices
                .push(
                    building.index
                );

            centerX +=
                building.x;

            centerZ +=
                building.z;
        }

        /*
         * Make instance colors available.
         */

        if (
            chunkMesh.instanceColor
        ) {

            chunkMesh.instanceColor.needsUpdate =
                true;
        }

        chunkMesh.instanceMatrix.needsUpdate =
            true;

        chunkMesh.computeBoundingSphere();

        /*
         * Center metadata is used by the lazy loader.
         */

        centerX /=
            buildings.length;

        centerZ /=
            buildings.length;

        chunkGroup.userData.cityChunkCenterX =
            centerX;

        chunkGroup.userData.cityChunkCenterZ =
            centerZ;

        chunkGroup.userData.cityChunkBuildingCount =
            buildings.length;

        /*
         * The body mesh and all building anchors live under
         * the same chunk.
         *
         * Hiding the chunk therefore hides both the building
         * body and all facade/label children.
         */

        chunkGroup.add(
            chunkMesh
        );

        for (
            const building
            of buildings
        ) {

            chunkGroup.add(
                building.anchor
            );
        }

        compiledCityBuildingGroup.add(
            chunkGroup
        );

        chunkList.push(
            chunkGroup
        );
    }

    compiledCityBuildingGroup.userData.spatialChunkCount =
        chunkList.length;

    compiledCityBuildingGroup.userData.spatialChunkCells =
        chunkCells;

    /*
     * --------------------------------------------------------
     * Compute city bounds from logical records.
     * --------------------------------------------------------
     */

    let minX =
        Infinity;

    let maxX =
        -Infinity;

    let minZ =
        Infinity;

    let maxZ =
        -Infinity;

    for (
        const building
        of compiledCityBuildings
    ) {

        minX =
            Math.min(
                minX,
                building.x
            );

        maxX =
            Math.max(
                maxX,
                building.x
            );

        minZ =
            Math.min(
                minZ,
                building.z
            );

        maxZ =
            Math.max(
                maxZ,
                building.z
            );
    }

    /*
     * Existing boundary system can continue using this
     * already-calculated logical boundary.
     */

    if (
        typeof threeSunlightSceneBoundary !==
        'undefined'
    ) {

        threeSunlightSceneBoundary = {

            minX:
                minX -
                25,

            maxX:
                maxX +
                25,

            minZ:
                minZ -
                25,

            maxZ:
                maxZ +
                25
        };
    }

    /*
     * Add the root city group once.
     */

    scene.add(
        compiledCityBuildingGroup
    );

    /*
     * Keep the existing ground.
     *
     * We intentionally call the ground function directly
     * instead of the old combined material function because
     * the old function expected the previous monolithic mesh.
     */

    if (
        typeof threeSunlightCreateCinematicGround ===
        'function'
    ) {

        threeSunlightCreateCinematicGround();
    }

    console.info(
        '[SpatialCity] Buildings:',
        totalBuildings
    );

    console.info(
        '[SpatialCity] Spatial chunks:',
        chunkList.length
    );

    console.info(
        '[SpatialCity] Approx buildings/chunk:',
        Math.round(
            totalBuildings /
            Math.max(
                chunkList.length,
                1
            )
        )
    );
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

    /*
     * The previous implementation redrew every active
     * CanvasTexture on every animation frame.
     *
     * That is unnecessary for scrolling text.
     *
     * We update approximately 8 times per second instead.
     */

    const update =
        () => {

            const timestamp =
                performance.now();

            if (
                typeof compiledCityActiveFacades ===
                'undefined'
            ) {

                return;
            }

            compiledCityActiveFacades.forEach(
                active => {

                    if (
                        !active ||
                        !Array.isArray(
                            active.canvases
                        )
                    ) {

                        return;
                    }

                    active.canvases.forEach(
                        canvas => {

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
        };

    update();

    window.setInterval(
        update,
        125
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

    /*
     * Remove every facade plane.
     */

    if (
        Array.isArray(active.facades)
    ) {

        for (
            const facade
            of active.facades
        ) {

            if (
                facade &&
                facade.parent
            ) {

                facade.parent.remove(
                    facade
                );
            }
        }
    }
    else if (
        active.facade &&
        active.facade.parent
    ) {

        active.facade.parent.remove(
            active.facade
        );
    }

    /*
     * Dispose every geometry.
     */

    if (
        Array.isArray(active.geometries)
    ) {

        for (
            const geometry
            of active.geometries
        ) {

            if (
                geometry &&
                typeof geometry.dispose ===
                'function'
            ) {

                geometry.dispose();
            }
        }
    }
    else if (
        active.geometry &&
        typeof active.geometry.dispose ===
        'function'
    ) {

        active.geometry.dispose();
    }

    /*
     * Dispose every material and its texture.
     *
     * This is important because each active building has
     * unique CanvasTextures.
     */

    const materials =
        Array.isArray(active.materials)
            ? active.materials
            : (
                active.material
                    ? [active.material]
                    : []
            );

    for (
        const material
        of materials
    ) {

        if (
            material &&
            material.map &&
            typeof material.map.dispose ===
            'function'
        ) {

            material.map.dispose();
        }

        if (
            material &&
            typeof material.dispose ===
            'function'
        ) {

            material.dispose();
        }
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




// ============================================================
// THREE SUNLIGHT - PROGRESSIVE CITY PERFORMANCE PATCH
// ============================================================


/* THREE_SUNLIGHT_TRUE_SPATIAL_CITY_START */

(() => {

    'use strict';

    const CONFIG = {

        /*
         * Six original city grid cells per chunk.
         *
         * 6 x 22 = 132 world units.
         */

        maxActiveChunks:
            5,

        startupChunks:
            2,

        activationPerPass:
            1,

        loadDistance:
            245,

        releaseDistance:
            325,

        updateInterval:
            220,

        movementThreshold:
            8,

        maxBuildingLabels:
            8,

        labelInterval:
            400,

        pixelRatio:
            1.15
    };

    const STATE = {

        initialized:
            false,

        activeChunks:
            new Set(),

        lastUpdate:
            0,

        lastCameraX:
            NaN,

        lastCameraY:
            NaN,

        lastCameraZ:
            NaN,

        labelLastUpdate:
            0,

        labelGroup:
            null,

        labels:
            new Map()
    };

    const scratch =
        new THREE.Vector3();

    /*
     * --------------------------------------------------------
     * Find the current city root.
     * --------------------------------------------------------
     */

    function getCity() {

        if (
            typeof compiledCityBuildingGroup !==
            'undefined' &&
            compiledCityBuildingGroup
        ) {

            return compiledCityBuildingGroup;
        }

        return null;
    }

    /*
     * --------------------------------------------------------
     * Find camera.
     * --------------------------------------------------------
     */

    function getCamera() {

        if (
            typeof camera !==
            'undefined' &&
            camera
        ) {

            return camera;
        }

        return null;
    }

    /*
     * --------------------------------------------------------
     * Get spatial chunks.
     * --------------------------------------------------------
     */

    function getChunks() {

        const city =
            getCity();

        if (
            !city
        ) {

            return [];
        }

        const chunks =
            [];

        for (
            let i = 0;
            i < city.children.length;
            i++
        ) {

            const child =
                city.children[i];

            if (
                child &&
                child.userData &&
                child.userData.threeSunlightSpatialChunk ===
                true
            ) {

                chunks.push(
                    child
                );
            }
        }

        return chunks;
    }

    /*
     * --------------------------------------------------------
     * Chunk distance.
     *
     * This uses stored X/Z metadata instead of calling
     * getWorldPosition() or computing bounding spheres.
     * --------------------------------------------------------
     */

    function getChunkDistanceSquared(
        chunk,
        activeCamera
    ) {

        if (
            !chunk ||
            !activeCamera
        ) {

            return Infinity;
        }

        const centerX =
            Number(
                chunk.userData.cityChunkCenterX
            );

        const centerZ =
            Number(
                chunk.userData.cityChunkCenterZ
            );

        const dx =
            centerX -
            activeCamera.position.x;

        const dz =
            centerZ -
            activeCamera.position.z;

        return (
            dx * dx +
            dz * dz
        );
    }

    /*
     * --------------------------------------------------------
     * Activate chunk.
     * --------------------------------------------------------
     */

    function activateChunk(
        chunk
    ) {

        if (
            !chunk
        ) {

            return;
        }

        chunk.visible =
            true;

        chunk.userData.cityChunkActive =
            true;

        STATE.activeChunks.add(
            chunk
        );
    }

    /*
     * --------------------------------------------------------
     * Deactivate chunk.
     *
     * Also release facade textures belonging to the chunk.
     * --------------------------------------------------------
     */

    function deactivateChunk(
        chunk
    ) {

        if (
            !chunk
        ) {

            return;
        }

        chunk.visible =
            false;

        chunk.userData.cityChunkActive =
            false;

        STATE.activeChunks.delete(
            chunk
        );

        const indices =
            chunk.userData &&
            Array.isArray(
                chunk.userData.buildingIndices
            )
                ? chunk.userData.buildingIndices
                : [];

        /*
         * Free expensive facade textures as the user moves
         * away from the city region.
         */

        if (
            typeof compiledCityDeactivateFacade ===
            'function'
        ) {

            for (
                const index
                of indices
            ) {

                if (
                    typeof compiledCityActiveFacades !==
                    'undefined' &&
                    compiledCityActiveFacades.has(
                        index
                    )
                ) {

                    try {

                        compiledCityDeactivateFacade(
                            index
                        );

                    }
                    catch (_) {}
                }
            }
        }
    }

    /*
     * --------------------------------------------------------
     * Camera movement check.
     * --------------------------------------------------------
     */

    function cameraMovedEnough(
        activeCamera
    ) {

        if (
            !activeCamera
        ) {

            return false;
        }

        const x =
            activeCamera.position.x;

        const y =
            activeCamera.position.y;

        const z =
            activeCamera.position.z;

        if (
            !Number.isFinite(
                STATE.lastCameraX
            )
        ) {

            STATE.lastCameraX =
                x;

            STATE.lastCameraY =
                y;

            STATE.lastCameraZ =
                z;

            return true;
        }

        const dx =
            x -
            STATE.lastCameraX;

        const dy =
            y -
            STATE.lastCameraY;

        const dz =
            z -
            STATE.lastCameraZ;

        const distanceSquared =
            dx * dx +
            dy * dy +
            dz * dz;

        if (
            distanceSquared >=
            CONFIG.movementThreshold *
            CONFIG.movementThreshold
        ) {

            STATE.lastCameraX =
                x;

            STATE.lastCameraY =
                y;

            STATE.lastCameraZ =
                z;

            return true;
        }

        return false;
    }

    /*
     * --------------------------------------------------------
     * Spatial loading pass.
     * --------------------------------------------------------
     */

    function updateSpatialChunks(
        force
    ) {

        const now =
            performance.now();

        if (
            !force &&
            now -
            STATE.lastUpdate <
            CONFIG.updateInterval
        ) {

            return false;
        }

        STATE.lastUpdate =
            now;

        const activeCamera =
            getCamera();

        if (
            !activeCamera
        ) {

            return false;
        }

        const chunks =
            getChunks();

        if (
            chunks.length === 0
        ) {

            return false;
        }

        /*
         * Do not perform the expensive sort when the camera
         * has barely moved.
         */

        if (
            !force &&
            STATE.initialized &&
            !cameraMovedEnough(
                activeCamera
            )
        ) {

            return false;
        }

        /*
         * First initialization must still record camera
         * coordinates.
         */

        if (
            !STATE.initialized
        ) {

            cameraMovedEnough(
                activeCamera
            );
        }

        const loadDistanceSquared =
            CONFIG.loadDistance *
            CONFIG.loadDistance;

        const releaseDistanceSquared =
            CONFIG.releaseDistance *
            CONFIG.releaseDistance;

        const candidates =
            [];

        /*
         * Only sort chunks that are actually inside the
         * loading radius.
         */

        for (
            const chunk
            of chunks
        ) {

            const distanceSquared =
                getChunkDistanceSquared(
                    chunk,
                    activeCamera
                );

            /*
             * Keep already-active chunks through the larger
             * release radius.
             */

            if (
                STATE.activeChunks.has(
                    chunk
                )
            ) {

                if (
                    distanceSquared >
                    releaseDistanceSquared
                ) {

                    deactivateChunk(
                        chunk
                    );
                }

                continue;
            }

            if (
                distanceSquared <=
                loadDistanceSquared
            ) {

                candidates.push(
                    {
                        chunk,
                        distanceSquared
                    }
                );
            }
        }

        /*
         * Nearest chunks first.
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
         * ----------------------------------------------------
         * Startup:
         *
         * only two chunks.
         * ----------------------------------------------------
         */

        let allowedNewChunks =
            STATE.initialized
                ? CONFIG.activationPerPass
                : CONFIG.startupChunks;

        /*
         * Never exceed the hard active-chunk cap.
         */

        allowedNewChunks =
            Math.min(
                allowedNewChunks,
                CONFIG.maxActiveChunks -
                STATE.activeChunks.size
            );

        let activated =
            0;

        let changed =
            false;

        for (
            const candidate
            of candidates
        ) {

            if (
                activated >=
                allowedNewChunks
            ) {

                break;
            }

            if (
                STATE.activeChunks.size >=
                CONFIG.maxActiveChunks
            ) {

                break;
            }

            activateChunk(
                candidate.chunk
            );

            activated++;

            changed =
                true;
        }

        /*
         * Mark initialized after the first controlled load.
         */

        STATE.initialized =
            true;

        /*
         * Update facade selection only when the city actually
         * changed.
         */

        if (
            changed &&
            typeof compiledCityUpdateFacades ===
            'function'
        ) {

            try {

                compiledCityUpdateFacades(
                    true
                );

            }
            catch (_) {}
        }

        return changed;
    }

    /*
     * --------------------------------------------------------
     * Floating building-number labels.
     *
     * These are intentionally limited to eight.
     *
     * Each label has one small CanvasTexture.
     * --------------------------------------------------------
     */

    function getLabelGroup() {

        if (
            STATE.labelGroup
        ) {

            return STATE.labelGroup;
        }

        const existing =
            scene.getObjectByName(
                'ThreeSunlightSpatialBuildingNumbers'
            );

        if (
            existing
        ) {

            STATE.labelGroup =
                existing;

            return existing;
        }

        const group =
            new THREE.Group();

        group.name =
            'ThreeSunlightSpatialBuildingNumbers';

        group.renderOrder =
            5000;

        scene.add(
            group
        );

        STATE.labelGroup =
            group;

        return group;
    }

    function createLabel(
        building
    ) {

        const canvas =
            document.createElement(
                'canvas'
            );

        canvas.width =
            512;

        canvas.height =
            128;

        const context =
            canvas.getContext(
                '2d'
            );

        if (
            !context
        ) {

            return null;
        }

        /*
         * Opaque backing guarantees readability.
         */

        context.fillStyle =
            'rgba(3,8,18,0.96)';

        context.fillRect(
            0,
            0,
            512,
            128
        );

        context.strokeStyle =
            '#00f0ff';

        context.lineWidth =
            5;

        context.strokeRect(
            5,
            5,
            502,
            118
        );

        context.textAlign =
            'center';

        context.textBaseline =
            'middle';

        context.font =
            'bold 72px Arial, sans-serif';

        context.fillStyle =
            '#00f0ff';

        context.shadowColor =
            '#00f0ff';

        context.shadowBlur =
            10;

        context.fillText(
            'BUILDING ' +
            String(
                building.index + 1
            ),
            256,
            64
        );

        context.shadowBlur =
            0;

        const texture =
            new THREE.CanvasTexture(
                canvas
            );

        texture.colorSpace =
            THREE.SRGBColorSpace;

        texture.minFilter =
            THREE.LinearFilter;

        texture.magFilter =
            THREE.LinearFilter;

        texture.generateMipmaps =
            false;

        texture.needsUpdate =
            true;

        const material =
            new THREE.SpriteMaterial({
                map:
                    texture,

                transparent:
                    true,

                depthWrite:
                    false,

                depthTest:
                    true,

                toneMapped:
                    false,

                sizeAttenuation:
                    true
            });

        const sprite =
            new THREE.Sprite(
                material
            );

        sprite.name =
            'SpatialBuildingNumber_' +
            String(
                building.index + 1
            );

        sprite.position.set(
            building.x,
            building.height + 5,
            building.z
        );

        sprite.scale.set(
            8.5,
            2.15,
            1
        );

        sprite.userData =
            sprite.userData || {};

        sprite.userData.spatialBuildingNumber =
            building.index + 1;

        sprite.userData.spatialLabelTexture =
            texture;

        getLabelGroup().add(
            sprite
        );

        return sprite;
    }

    function disposeLabel(
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
            sprite.material
        ) {

            if (
                sprite.material.map
            ) {

                sprite.material.map.dispose();
            }

            sprite.material.dispose();
        }
    }

    function updateLabels() {

        const now =
            performance.now();

        if (
            now -
            STATE.labelLastUpdate <
            CONFIG.labelInterval
        ) {

            return;
        }

        STATE.labelLastUpdate =
            now;

        if (
            typeof compiledCityBuildings ===
            'undefined' ||
            !Array.isArray(
                compiledCityBuildings
            )
        ) {

            return;
        }

        const activeBuildings =
            [];

        /*
         * Only inspect buildings belonging to active chunks.
         *
         * This avoids scanning all 4,809 records.
         */

        for (
            const chunk
            of STATE.activeChunks
        ) {

            const indices =
                chunk.userData &&
                Array.isArray(
                    chunk.userData.buildingIndices
                )
                    ? chunk.userData.buildingIndices
                    : [];

            for (
                const index
                of indices
            ) {

                const building =
                    compiledCityBuildings[
                        index
                    ];

                if (
                    !building
                ) {

                    continue;
                }

                const dx =
                    building.x -
                    camera.position.x;

                const dz =
                    building.z -
                    camera.position.z;

                activeBuildings.push(
                    {
                        building,
                        distanceSquared:
                            dx * dx +
                            dz * dz
                    }
                );
            }
        }

        activeBuildings.sort(
            (
                a,
                b
            ) =>
                a.distanceSquared -
                b.distanceSquared
        );

        const desired =
            new Set();

        for (
            let i = 0;
            i <
            Math.min(
                CONFIG.maxBuildingLabels,
                activeBuildings.length
            );
            i++
        ) {

            desired.add(
                activeBuildings[i]
                    .building
                    .index
            );
        }

        /*
         * Remove labels no longer desired.
         */

        for (
            const [
                index,
                sprite
            ]
            of STATE.labels
        ) {

            if (
                !desired.has(
                    index
                )
            ) {

                disposeLabel(
                    sprite
                );

                STATE.labels.delete(
                    index
                );
            }
        }

        /*
         * Add missing labels.
         */

        for (
            const item
            of activeBuildings
        ) {

            const index =
                item.building.index;

            if (
                !desired.has(
                    index
                )
            ) {

                continue;
            }

            if (
                STATE.labels.has(
                    index
                )
            ) {

                continue;
            }

            const sprite =
                createLabel(
                    item.building
                );

            if (
                sprite
            ) {

                STATE.labels.set(
                    index,
                    sprite
                );
            }

            if (
                STATE.labels.size >=
                CONFIG.maxBuildingLabels
            ) {

                break;
            }
        }
    }

    /*
     * --------------------------------------------------------
     * Renderer tuning.
     * --------------------------------------------------------
     */

    function tuneRenderer() {

        try {

            if (
                typeof renderer !==
                'undefined' &&
                renderer
            ) {

                renderer.setPixelRatio(
                    Math.min(
                        window.devicePixelRatio || 1,
                        CONFIG.pixelRatio
                    )
                );
            }

        }
        catch (error) {

            console.warn(
                '[SpatialCity] Renderer tuning failed:',
                error
            );
        }

        /*
         * Keep SunLight for illumination but remove the
         * expensive shadow pass.
         */

        try {

            if (
                typeof sunLight !==
                'undefined' &&
                sunLight
            ) {

                sunLight.castShadow =
                    false;

                if (
                    sunLight.shadow &&
                    sunLight.shadow.mapSize
                ) {

                    sunLight.shadow.mapSize.set(
                        1024,
                        1024
                    );
                }
            }

        }
        catch (_) {}
    }

    /*
     * --------------------------------------------------------
     * Public diagnostics.
     * --------------------------------------------------------
     */

    window.threeSunlightSpatialCity =
        {

            refresh() {

                return updateSpatialChunks(
                    true
                );
            },

            stats() {

                const chunks =
                    getChunks();

                return {

                    totalBuildings:
                        typeof compiledCityBuildings !==
                        'undefined'
                            ? compiledCityBuildings.length
                            : 0,

                    totalChunks:
                        chunks.length,

                    activeChunks:
                        STATE.activeChunks.size,

                    maxActiveChunks:
                        CONFIG.maxActiveChunks,

                    startupChunks:
                        CONFIG.startupChunks,

                    activationPerPass:
                        CONFIG.activationPerPass,

                    loadDistance:
                        CONFIG.loadDistance,

                    releaseDistance:
                        CONFIG.releaseDistance,

                    activeLabels:
                        STATE.labels.size
                };
            }
        };

    /*
     * --------------------------------------------------------
     * Main timer.
     *
     * No second requestAnimationFrame loop is created.
     * --------------------------------------------------------
     */

    window.setInterval(
        () => {

            try {

                updateSpatialChunks(
                    false
                );

                updateLabels();

            }
            catch (error) {

                console.warn(
                    '[SpatialCity] Update skipped:',
                    error
                );
            }

        },
        CONFIG.updateInterval
    );

    /*
     * --------------------------------------------------------
     * Initial startup.
     *
     * The first pass intentionally loads only two chunks.
     * --------------------------------------------------------
     */

    window.setTimeout(
        () => {

            try {

                tuneRenderer();

                updateSpatialChunks(
                    true
                );

                updateLabels();

                console.info(
                    '[SpatialCity] TRUE spatial InstancedMesh city enabled.'
                );

                console.info(
                    '[SpatialCity] Maximum active chunks:',
                    CONFIG.maxActiveChunks
                );

                console.info(
                    '[SpatialCity] Startup chunks:',
                    CONFIG.startupChunks
                );

                console.info(
                    '[SpatialCity] Activation per pass:',
                    CONFIG.activationPerPass
                );

                console.info(
                    '[SpatialCity] Load distance:',
                    CONFIG.loadDistance
                );

                console.info(
                    '[SpatialCity] Release distance:',
                    CONFIG.releaseDistance
                );

            }
            catch (error) {

                console.warn(
                    '[SpatialCity] Startup failed:',
                    error
                );
            }

        },
        900
    );

})();

/* THREE_SUNLIGHT_TRUE_SPATIAL_CITY_END */

// THREE_SUNLIGHT_BRIGHT_SPARKLE_SCENE_START
(() => {
    /*
     * THREE SUNLIGHT
     * BRIGHT + SPARKLY ENVIRONMENT
     *
     * This system deliberately avoids touching the existing
     * building/chunk renderer.
     */

    const brightSparkleScene = {
        installed: true,
        stars: null,
        starMaterial: null,
        starGeometry: null,
        starPositions: null,
        starPhases: null,
        starCount: 900,
        lastUpdate: 0,
        frameInterval: 1000 / 18,
        baseExposure: 1.18,
        initialized: false
    };

    function brightSparkleFindScene() {
        if (typeof scene !== 'undefined' && scene) {
            return scene;
        }

        if (typeof window !== 'undefined' && window.__THREE_SUNLIGHT_SCENE__) {
            return window.__THREE_SUNLIGHT_SCENE__;
        }

        return null;
    }

    function brightSparkleFindRenderer() {
        if (typeof renderer !== 'undefined' && renderer) {
            return renderer;
        }

        if (typeof window !== 'undefined' && window.__THREE_SUNLIGHT_RENDERER__) {
            return window.__THREE_SUNLIGHT_RENDERER__;
        }

        return null;
    }

    function brightSparkleFindCamera() {
        if (typeof camera !== 'undefined' && camera) {
            return camera;
        }

        if (typeof window !== 'undefined' && window.__THREE_SUNLIGHT_CAMERA__) {
            return window.__THREE_SUNLIGHT_CAMERA__;
        }

        return null;
    }

    function brightSparkleCreateStars(activeScene) {

        if (!activeScene) {
            return null;
        }

        if (brightSparkleScene.stars) {
            return brightSparkleScene.stars;
        }

        const starCount = brightSparkleScene.starCount;

        const positions = new Float32Array(starCount * 3);
        const phases = new Float32Array(starCount);

        /*
         * Stars are placed in a large shell around the city.
         * They are deliberately sparse.
         *
         * One THREE.Points object means one draw call rather
         * than hundreds/thousands of individual meshes.
         */

        for (let i = 0; i < starCount; i++) {

            const i3 = i * 3;

            const radius =
                420 +
                Math.random() * 900;

            const theta =
                Math.random() *
                Math.PI *
                2;

            const phi =
                Math.acos(
                    (Math.random() * 2) - 1
                );

            positions[i3] =
                Math.sin(phi) *
                Math.cos(theta) *
                radius;

            positions[i3 + 1] =
                Math.cos(phi) *
                radius *
                0.72;

            positions[i3 + 2] =
                Math.sin(phi) *
                Math.sin(theta) *
                radius;

            phases[i] =
                Math.random() *
                Math.PI *
                2;
        }

        const geometry =
            new THREE.BufferGeometry();

        geometry.setAttribute(
            'position',
            new THREE.BufferAttribute(
                positions,
                3
            )
        );

        const material =
            new THREE.PointsMaterial({
                color: 0xdff8ff,
                size: 1.55,
                sizeAttenuation: true,
                transparent: true,
                opacity: 0.78,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            });

        const stars =
            new THREE.Points(
                geometry,
                material
            );

        stars.name =
            'ThreeSunlight_BrightSparkleStars';

        stars.frustumCulled = false;

        activeScene.add(stars);

        brightSparkleScene.stars = stars;
        brightSparkleScene.starGeometry = geometry;
        brightSparkleScene.starMaterial = material;
        brightSparkleScene.starPositions = positions;
        brightSparkleScene.starPhases = phases;

        return stars;
    }

    function brightSparkleConfigureRenderer() {

        const activeRenderer =
            brightSparkleFindRenderer();

        if (!activeRenderer) {
            return;
        }

        /*
         * A moderate exposure increase makes the scene brighter
         * without creating a second lighting system.
         */

        try {

            if ('toneMappingExposure' in activeRenderer) {
                activeRenderer.toneMappingExposure =
                    brightSparkleScene.baseExposure;
            }

        } catch (_) {
            // Renderer may be WebGPU-specific.
        }

        /*
         * If the renderer exposes physically correct lighting,
         * leave its existing choice untouched.
         *
         * We deliberately do not change antialiasing,
         * pixel ratio, shadows, or power preferences here because
         * the current application may depend on them.
         */
    }

    function brightSparkleConfigureScene(activeScene) {

        if (!activeScene) {
            return;
        }

        /*
         * Brighter background without replacing an existing
         * galaxy/sky object.
         */

        try {

            if (
                activeScene.background === null ||
                activeScene.background === undefined
            ) {

                activeScene.background =
                    new THREE.Color(0x07162b);

            } else if (
                activeScene.background.isColor
            ) {

                /*
                 * Slightly lift very dark backgrounds.
                 * Existing non-color backgrounds are preserved.
                 */

                const current =
                    activeScene.background.clone();

                const r = Math.min(
                    1,
                    current.r * 1.16 + 0.015
                );

                const g = Math.min(
                    1,
                    current.g * 1.16 + 0.02
                );

                const b = Math.min(
                    1,
                    current.b * 1.18 + 0.025
                );

                activeScene.background.setRGB(
                    r,
                    g,
                    b
                );
            }

        } catch (_) {
            // Existing background remains untouched.
        }
    }

    function brightSparkleInstall() {

        if (brightSparkleScene.initialized) {
            return;
        }

        const activeScene =
            brightSparkleFindScene();

        if (!activeScene) {
            return;
        }

        brightSparkleConfigureScene(
            activeScene
        );

        brightSparkleConfigureRenderer();

        brightSparkleCreateStars(
            activeScene
        );

        brightSparkleScene.initialized =
            true;

        if (
            typeof window !== 'undefined'
        ) {
            window.__THREE_SUNLIGHT_BRIGHT_SPARKLE__ =
                brightSparkleScene;
        }
    }

    function brightSparkleUpdate(timeMs) {

        if (!brightSparkleScene.initialized) {
            brightSparkleInstall();
            return;
        }

        if (
            timeMs -
            brightSparkleScene.lastUpdate <
            brightSparkleScene.frameInterval
        ) {
            return;
        }

        brightSparkleScene.lastUpdate =
            timeMs;

        const stars =
            brightSparkleScene.stars;

        const material =
            brightSparkleScene.starMaterial;

        if (!stars || !material) {
            return;
        }

        /*
         * Keep star animation deliberately cheap.
         *
         * We animate material opacity rather than moving hundreds
         * of vertices every frame.
         */

        const wave =
            0.5 +
            0.5 *
            Math.sin(
                timeMs * 0.00055
            );

        material.opacity =
            0.66 +
            wave * 0.20;

        /*
         * Very slow rotation gives the sky some life while being
         * effectively negligible compared with building rendering.
         */

        stars.rotation.y =
            timeMs * 0.000003;

        stars.rotation.x =
            Math.sin(
                timeMs * 0.000025
            ) * 0.015;
    }

    /*
     * Public hooks.
     *
     * The installer does not assume the exact architecture of
     * the existing render loop.
     */

    if (
        typeof window !== 'undefined'
    ) {

        window.__THREE_SUNLIGHT_BRIGHT_SPARKLE_INSTALL__ =
            brightSparkleInstall;

        window.__THREE_SUNLIGHT_BRIGHT_SPARKLE_UPDATE__ =
            brightSparkleUpdate;
    }

    /*
     * Try immediately, then again after the existing application
     * has completed its renderer/scene initialization.
     */

    try {
        brightSparkleInstall();
    } catch (_) {
        // Retry below.
    }

    if (
        typeof window !== 'undefined'
    ) {

        window.addEventListener(
            'load',
            () => {

                try {
                    brightSparkleInstall();
                } catch (_) {}
            },
            {
                once: true
            }
        );
    }

})();
// THREE_SUNLIGHT_BRIGHT_SPARKLE_SCENE_END


// THREE_SUNLIGHT_BRIGHT_SPARKLE_LOOP_START
(() => {

    if (
        typeof window === 'undefined'
    ) {
        return;
    }

    if (
        window.__THREE_SUNLIGHT_BRIGHT_SPARKLE_LOOP_RUNNING__
    ) {
        return;
    }

    window.__THREE_SUNLIGHT_BRIGHT_SPARKLE_LOOP_RUNNING__ =
        true;

    const sparkleLoop =
        (timeMs) => {

            const update =
                window.__THREE_SUNLIGHT_BRIGHT_SPARKLE_UPDATE__;

            if (
                typeof update === 'function'
            ) {
                update(timeMs);
            }

            window.requestAnimationFrame(
                sparkleLoop
            );
        };

    window.requestAnimationFrame(
        sparkleLoop
    );

})();
// THREE_SUNLIGHT_BRIGHT_SPARKLE_LOOP_END
