#requires -Version 7.0

$ErrorActionPreference = 'Stop'

# ============================================================
# THREE SUNLIGHT - TRUE SPATIAL INSTANCED CITY
# ============================================================
#
# IMPORTANT:
#
# This installer replaces the monolithic compiled-city
# InstancedMesh with real spatial InstancedMesh chunks.
#
# PERFORMANCE TARGET:
#
#   * 6 x 6 buildings per spatial chunk
#   * ~36 buildings per chunk
#   * Maximum 5 visible chunks
#   * 2 chunks at startup
#   * 1 new chunk per loading pass
#   * Distant chunks released
#   * Lightweight MeshBasicMaterial
#   * Building shadows disabled
#   * Renderer pixel ratio capped
#   * Maximum 6 live facade buildings
#   * Facade animation throttled
#   * Maximum 8 floating building labels
#
# PRESERVED:
#
#   * Existing WebGPU renderer
#   * Existing THREE.Scene
#   * Existing camera
#   * Existing FirstPersonControls
#   * Existing collision
#   * Existing galaxy / sky
#   * Existing SunLight
#   * Existing Compiled.txt city data
#   * Existing facade placement
#   * Existing text system
#
# SAFETY:
#
#   * Creates backup before modification
#   * Generates Node helper instead of fragile PS parsing
#   * Validates source
#   * Runs npm run build
#   * Automatically restores backup if build fails
#
# ============================================================

$ProjectRoot = 'C:\ThreeSunlight'
$MainPath    = Join-Path $ProjectRoot 'src\main.js'
$PackagePath = Join-Path $ProjectRoot 'package.json'

$Timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'

$BackupPath = Join-Path `
    $ProjectRoot `
    "src\main.before-true-spatial-city-$Timestamp.js"

$NodeHelperPath = Join-Path `
    $ProjectRoot `
    '.true-spatial-city-installer.cjs'

function Write-Step {
    param(
        [string]$Text
    )

    Write-Host ''
    Write-Host $Text -ForegroundColor Cyan
    Write-Host ('-' * 60) -ForegroundColor DarkCyan
}

function Write-Ok {
    param(
        [string]$Text
    )

    Write-Host "[OK]   $Text" -ForegroundColor Green
}

function Write-Info {
    param(
        [string]$Text
    )

    Write-Host "[INFO] $Text" -ForegroundColor Yellow
}

function Write-Warn {
    param(
        [string]$Text
    )

    Write-Host "[WARN] $Text" -ForegroundColor Yellow
}

function Fail {
    param(
        [string]$Text
    )

    throw $Text
}

function Restore-Backup {
    if (Test-Path -LiteralPath $BackupPath) {

        Write-Host ''
        Write-Host '============================================================' -ForegroundColor Red
        Write-Host 'ROLLBACK' -ForegroundColor Red
        Write-Host '============================================================' -ForegroundColor Red

        try {

            Copy-Item `
                -LiteralPath $BackupPath `
                -Destination $MainPath `
                -Force

            Write-Host '[OK] Original main.js restored.' -ForegroundColor Green

        }
        catch {

            Write-Host '[ERROR] Automatic rollback failed.' -ForegroundColor Red
            Write-Host $_.Exception.Message -ForegroundColor Red
        }
    }
}

try {

    Write-Host ''
    Write-Host '============================================================' -ForegroundColor Cyan
    Write-Host ' THREE SUNLIGHT - TRUE SPATIAL INSTANCED CITY' -ForegroundColor Cyan
    Write-Host '============================================================' -ForegroundColor Cyan
    Write-Host ''
    Write-Host 'Performance architecture:' -ForegroundColor White
    Write-Host ''
    Write-Host '  * REAL spatial InstancedMesh chunks'
    Write-Host '  * 6 x 6 buildings per chunk'
    Write-Host '  * ~36 buildings per chunk'
    Write-Host '  * Maximum 5 visible chunks'
    Write-Host '  * Only 2 chunks at startup'
    Write-Host '  * Only 1 new chunk per loading pass'
    Write-Host '  * Distant chunks released'
    Write-Host '  * Shared BoxGeometry'
    Write-Host '  * Shared lightweight MeshBasicMaterial'
    Write-Host '  * Vibrant per-instance colors'
    Write-Host '  * Building shadows disabled'
    Write-Host '  * Pixel ratio capped at 1.15'
    Write-Host '  * Maximum 6 live facade buildings'
    Write-Host '  * Facade animation throttled to ~8 FPS'
    Write-Host '  * Maximum 8 floating building numbers'
    Write-Host '  * Existing WebGPU renderer preserved'
    Write-Host '  * Existing camera preserved'
    Write-Host '  * Existing collision preserved'
    Write-Host '  * Existing text/facade architecture preserved'
    Write-Host '  * Automatic build validation'
    Write-Host '  * Automatic rollback'
    Write-Host ''

    # ========================================================
    # 1. PROJECT CHECK
    # ========================================================

    Write-Step '[1/10] Checking project...'

    if (-not (Test-Path -LiteralPath $ProjectRoot)) {
        Fail "Project directory not found: $ProjectRoot"
    }

    if (-not (Test-Path -LiteralPath $MainPath)) {
        Fail "main.js not found: $MainPath"
    }

    if (-not (Test-Path -LiteralPath $PackagePath)) {
        Fail "package.json not found: $PackagePath"
    }

    Write-Ok "Project: $ProjectRoot"
    Write-Ok 'main.js found.'
    Write-Ok 'package.json found.'

    # ========================================================
    # 2. NODE CHECK
    # ========================================================

    Write-Step '[2/10] Checking Node.js...'

    $nodeCommand = Get-Command node -ErrorAction SilentlyContinue

    if (-not $nodeCommand) {
        Fail 'Node.js was not found in PATH.'
    }

    $nodeVersion = (& node --version).Trim()

    Write-Ok "Node.js: $nodeVersion"

    # ========================================================
    # 3. READ SOURCE
    # ========================================================

    Write-Step '[3/10] Reading current main.js...'

    $MainSource = Get-Content `
        -LiteralPath $MainPath `
        -Raw `
        -Encoding UTF8

    Write-Ok 'Source loaded.'
    Write-Host "      Characters: $($MainSource.Length)"

    # ========================================================
    # 4. ARCHITECTURE VALIDATION
    # ========================================================

    Write-Step '[4/10] Verifying current ThreeSunlight architecture...'

    $RequiredTokens = @(
        'import * as THREE from ''three/webgpu''',
        'new THREE.Scene()',
        'new THREE.InstancedMesh',
        'compiledCityBuildingGroup',
        'compiledCityCreateBuildings',
        'compiledCityUpdateFacades',
        'compiledCityActivateFacade',
        'compiledCityDeactivateFacade',
        'function animate()'
    )

    foreach ($Token in $RequiredTokens) {

        if (-not $MainSource.Contains($Token)) {
            Fail "Required architecture token was not found: $Token"
        }

        Write-Ok $Token
    }

    # ========================================================
    # CHECK FUNCTION COUNTS
    # ========================================================

    $CreateFunctionCount = `
        ([regex]::Matches(
            $MainSource,
            'function\s+compiledCityCreateBuildings\s*\('
        )).Count

    if ($CreateFunctionCount -ne 1) {
        Fail "Expected exactly one compiledCityCreateBuildings() function; found $CreateFunctionCount."
    }

    $DeactivateFunctionCount = `
        ([regex]::Matches(
            $MainSource,
            'function\s+compiledCityDeactivateFacade\s*\('
        )).Count

    if ($DeactivateFunctionCount -ne 1) {
        Fail "Expected exactly one compiledCityDeactivateFacade() function; found $DeactivateFunctionCount."
    }

    $NewsreelFunctionCount = `
        ([regex]::Matches(
            $MainSource,
            'function\s+compiledCityStartNewsreelAnimation\s*\('
        )).Count

    if ($NewsreelFunctionCount -ne 1) {
        Fail "Expected exactly one compiledCityStartNewsreelAnimation() function; found $NewsreelFunctionCount."
    }

    Write-Ok 'Exactly one city creation function.'
    Write-Ok 'Exactly one facade cleanup function.'
    Write-Ok 'Exactly one newsreel animation function.'

    # ========================================================
    # 5. BACKUP
    # ========================================================

    Write-Step '[5/10] Creating backup...'

    Copy-Item `
        -LiteralPath $MainPath `
        -Destination $BackupPath `
        -Force

    Write-Ok "Backup created:"
    Write-Host "     $BackupPath"

    # ========================================================
    # 6. CREATE NODE TRANSFORMER
    # ========================================================

    Write-Step '[6/10] Preparing architecture-aware transformer...'

    $NodeScript = @'
'use strict';

const fs = require('fs');

const mainPath = process.argv[2];

if (!mainPath) {
    console.error('Missing main.js path.');
    process.exit(2);
}

let source = fs.readFileSync(mainPath, 'utf8');

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/*
 * ------------------------------------------------------------
 * Remove generated marker blocks.
 * ------------------------------------------------------------
 */
function removeMarkedBlocks(text, startMarker, endMarker) {

    const pattern =
        new RegExp(
            escapeRegExp(startMarker) +
            '[\\s\\S]*?' +
            escapeRegExp(endMarker),
            'g'
        );

    return text.replace(pattern, '');
}

/*
 * ------------------------------------------------------------
 * Count literal occurrences.
 * ------------------------------------------------------------
 */
function countOccurrences(text, token) {

    let count = 0;
    let offset = 0;

    while (true) {

        const index =
            text.indexOf(token, offset);

        if (index < 0) {
            break;
        }

        count++;
        offset = index + token.length;
    }

    return count;
}

/*
 * ------------------------------------------------------------
 * Replace a top-level function safely.
 *
 * This scans braces while ignoring:
 *
 *   strings
 *   comments
 *   template strings
 *
 * The targeted functions do not contain nested template
 * expressions that need to be parsed separately.
 * ------------------------------------------------------------
 */
function replaceFunction(text, functionName, replacement) {

    const signature =
        'function ' + functionName;

    const start =
        text.indexOf(signature);

    if (start < 0) {

        throw new Error(
            'Could not locate function: ' +
            functionName
        );
    }

    const braceStart =
        text.indexOf('{', start);

    if (braceStart < 0) {

        throw new Error(
            'Could not locate opening brace for function: ' +
            functionName
        );
    }

    let depth = 0;

    let state = 'code';

    let escaped = false;

    for (
        let i = braceStart;
        i < text.length;
        i++
    ) {

        const c =
            text[i];

        const n =
            text[i + 1];

        if (state === 'single') {

            if (escaped) {

                escaped = false;

                continue;
            }

            if (c === '\\') {

                escaped = true;

                continue;
            }

            if (c === "'") {

                state = 'code';
            }

            continue;
        }

        if (state === 'double') {

            if (escaped) {

                escaped = false;

                continue;
            }

            if (c === '\\') {

                escaped = true;

                continue;
            }

            if (c === '"') {

                state = 'code';
            }

            continue;
        }

        if (state === 'template') {

            if (escaped) {

                escaped = false;

                continue;
            }

            if (c === '\\') {

                escaped = true;

                continue;
            }

            if (c === '`') {

                state = 'code';
            }

            continue;
        }

        if (state === 'lineComment') {

            if (c === '\n') {

                state = 'code';
            }

            continue;
        }

        if (state === 'blockComment') {

            if (c === '*' && n === '/') {

                state = 'code';

                i++;

            }

            continue;
        }

        if (c === "'" ) {

            state = 'single';

            continue;
        }

        if (c === '"') {

            state = 'double';

            continue;
        }

        if (c === '`') {

            state = 'template';

            continue;
        }

        if (c === '/' && n === '/') {

            state = 'lineComment';

            i++;

            continue;
        }

        if (c === '/' && n === '*') {

            state = 'blockComment';

            i++;

            continue;
        }

        if (c === '{') {

            depth++;

            continue;
        }

        if (c === '}') {

            depth--;

            if (depth === 0) {

                const end =
                    i + 1;

                return (
                    text.slice(0, start) +
                    replacement +
                    text.slice(end)
                );
            }
        }
    }

    throw new Error(
        'Could not locate closing brace for function: ' +
        functionName
    );
}

/*
 * ------------------------------------------------------------
 * Remove previous spatial-city installer blocks.
 * ------------------------------------------------------------
 */
source =
    removeMarkedBlocks(
        source,
        '/* THREE_SUNLIGHT_TRUE_SPATIAL_CITY_START */',
        '/* THREE_SUNLIGHT_TRUE_SPATIAL_CITY_END */'
    );

/*
 * Remove previous high-performance controllers.
 *
 * These older systems only hid the monolithic mesh and would
 * fight the new real spatial chunk system.
 */
source =
    removeMarkedBlocks(
        source,
        '// THREE_SUNLIGHT_HIGH_PERFORMANCE_CITY_START',
        '// THREE_SUNLIGHT_HIGH_PERFORMANCE_CITY_END'
    );

source =
    removeMarkedBlocks(
        source,
        '/* THREE_SUNLIGHT_HIGH_PERFORMANCE_CITY_START */',
        '/* THREE_SUNLIGHT_HIGH_PERFORMANCE_CITY_END */'
    );

source =
    removeMarkedBlocks(
        source,
        '/* THREE_SUNLIGHT_PERFORMANCE_GOVERNOR_START */',
        '/* THREE_SUNLIGHT_PERFORMANCE_GOVERNOR_END */'
    );

source =
    removeMarkedBlocks(
        source,
        '/* THREE_SUNLIGHT_PROGRESSIVE_CITY_START */',
        '/* THREE_SUNLIGHT_PROGRESSIVE_CITY_END */'
    );

/*
 * ------------------------------------------------------------
 * Tune the existing facade system.
 * ------------------------------------------------------------
 */

source =
    source.replace(
        /const\s+COMPILED_CITY_ACTIVE_RADIUS\s*=\s*[^;]+;/g,
        'const COMPILED_CITY_ACTIVE_RADIUS = 120;'
    );

source =
    source.replace(
        /const\s+COMPILED_CITY_RELEASE_RADIUS\s*=\s*[^;]+;/g,
        'const COMPILED_CITY_RELEASE_RADIUS = 160;'
    );

source =
    source.replace(
        /const\s+COMPILED_CITY_MAX_ACTIVE_FACADES\s*=\s*[^;]+;/g,
        'const COMPILED_CITY_MAX_ACTIVE_FACADES = 6;'
    );

/*
 * ------------------------------------------------------------
 * Reduce expensive shadow work.
 * ------------------------------------------------------------
 */

source =
    source.replace(
        /sunLight\.castShadow\s*=\s*true\s*;/,
        'sunLight.castShadow = false;'
    );

source =
    source.replace(
        /resolution\s*:\s*2048\s*,/,
        'resolution: 1024,'
    );

/*
 * ------------------------------------------------------------
 * Cap renderer pixel ratio.
 *
 * Text remains crisp because facade CanvasTextures remain
 * high resolution independently of the screen render ratio.
 * ------------------------------------------------------------
 */

source =
    source.replace(
        /renderer\.setPixelRatio\(\s*Math\.min\(\s*window\.devicePixelRatio,\s*2\s*\)\s*\);/,
        'renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.15));'
    );

/*
 * ------------------------------------------------------------
 * Remove duplicate animatedFacades.update() block if the
 * current file contains the duplicated animation patch.
 * ------------------------------------------------------------
 */

const animatedFacadeBlock =
    /if\s*\(\s*typeof\s+animatedFacades\s*!==\s*['"]undefined['"]\s*&&\s*animatedFacades\s*\)\s*\{[\s\S]*?animatedFacades\.update\(\s*facadeElapsed\s*\);\s*\}/g;

const animatedMatches =
    source.match(animatedFacadeBlock);

if (
    animatedMatches &&
    animatedMatches.length > 1
) {

    let seen = 0;

    source =
        source.replace(
            animatedFacadeBlock,
            match => {

                seen++;

                if (seen === 1) {

                    return match;
                }

                return '';
            }
        );
}

/*
 * ============================================================
 * REAL SPATIAL INSTANCED CITY
 * ============================================================
 */

const newCreateBuildings = String.raw`
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
`;

source =
    replaceFunction(
        source,
        'compiledCityCreateBuildings',
        newCreateBuildings
    );

/*
 * ============================================================
 * CLEAN FACADE DISPOSAL
 * ============================================================
 */

const newDeactivateFacade = String.raw`
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
`;

source =
    replaceFunction(
        source,
        'compiledCityDeactivateFacade',
        newDeactivateFacade
    );

/*
 * ============================================================
 * THROTTLED NEWSREEL ANIMATION
 * ============================================================
 */

const newNewsreelAnimation = String.raw`
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
`;

source =
    replaceFunction(
        source,
        'compiledCityStartNewsreelAnimation',
        newNewsreelAnimation
    );

/*
 * ============================================================
 * TRUE SPATIAL CITY GOVERNOR
 * ============================================================
 */

const spatialPatch = String.raw`

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

`;

source =
    source +
    spatialPatch;

/*
 * ============================================================
 * FINAL SOURCE VALIDATION
 * ============================================================
 */

const requiredAfterInstall = [

    'THREE_SUNLIGHT_TRUE_SPATIAL_CITY_START',

    'THREE_SUNLIGHT_TRUE_SPATIAL_CITY_END',

    'threeSunlightSpatialCity',

    'maxActiveChunks',

    'startupChunks',

    'activationPerPass',

    'CompiledCityBuildingGroup',

    'CompiledCitySpatialChunk_',

    'new THREE.InstancedMesh',

    'compiledCityDeactivateFacade'

];

for (
    const token
    of requiredAfterInstall
) {

    if (
        !source.includes(
            token
        )
    ) {

        throw new Error(
            'Generated source is missing required token: ' +
            token
        );
    }
}

const startMarkerCount =
    countOccurrences(
        source,
        '/* THREE_SUNLIGHT_TRUE_SPATIAL_CITY_START */'
    );

const endMarkerCount =
    countOccurrences(
        source,
        '/* THREE_SUNLIGHT_TRUE_SPATIAL_CITY_END */'
    );

if (
    startMarkerCount !== 1
) {

    throw new Error(
        'Expected exactly one spatial city start marker; found ' +
        startMarkerCount
    );
}

if (
    endMarkerCount !== 1
) {

    throw new Error(
        'Expected exactly one spatial city end marker; found ' +
        endMarkerCount
    );
}

/*
 * Old controllers must not survive.
 */

const oldHighPerformanceCount =
    countOccurrences(
        source,
        'THREE_SUNLIGHT_HIGH_PERFORMANCE_CITY_START'
    );

if (
    oldHighPerformanceCount !== 0
) {

    throw new Error(
        'Old high-performance city controller was not completely removed.'
    );
}

const oldProgressiveCount =
    countOccurrences(
        source,
        'THREE_SUNLIGHT_PROGRESSIVE_CITY_START'
    );

if (
    oldProgressiveCount !== 0
) {

    throw new Error(
        'Old progressive city controller was not completely removed.'
    );
}

/*
 * Ensure only one compiledCityCreateBuildings function exists.
 */

const createCount =
    (
        source.match(
            /function\s+compiledCityCreateBuildings\s*\(/g
        ) || []
    ).length;

if (
    createCount !== 1
) {

    throw new Error(
        'Expected exactly one compiledCityCreateBuildings() after installation; found ' +
        createCount
    );
}

/*
 * Ensure the source still has a real animation function.
 */

if (
    !/function\s+animate\s*\(\s*\)/.test(
        source
    )
) {

    throw new Error(
        'Existing animate() function was lost.'
    );
}

/*
 * Ensure the source still has the WebGPU import.
 */

if (
    !source.includes(
        "import * as THREE from 'three/webgpu';"
    )
) {

    throw new Error(
        'Existing WebGPU Three.js import was lost.'
    );
}

fs.writeFileSync(
    mainPath,
    source,
    'utf8'
);

console.log('');
console.log(
    '[Node] Spatial city transformation completed.'
);

console.log(
    '[Node] Real InstancedMesh chunk system installed.'
);

console.log(
    '[Node] Existing city creation function replaced.'
);

console.log(
    '[Node] Existing facade disposal upgraded.'
);

console.log(
    '[Node] Newsreel animation throttled.'
);

console.log(
    '[Node] Old visibility governors removed.'
);

console.log(
    '[Node] Source validation passed.'
);

'@

    Set-Content `
        -LiteralPath $NodeHelperPath `
        -Value $NodeScript `
        -Encoding UTF8

    Write-Ok 'Node architecture transformer created.'

    # ========================================================
    # 7. RUN TRANSFORMER
    # ========================================================

    Write-Step '[7/10] Rebuilding city architecture as spatial chunks...'

    try {

        & node `
            $NodeHelperPath `
            $MainPath

        if (
            $LASTEXITCODE -ne 0
        ) {

            throw "Node transformer exited with code $LASTEXITCODE."
        }

    }
    catch {

        Write-Host ''
        Write-Host 'Spatial transformation failed.' -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red

        Restore-Backup

        throw
    }

    Write-Ok 'Spatial InstancedMesh chunks installed.'
    Write-Ok 'Monolithic city renderer replaced.'
    Write-Ok 'Only chunk groups will be visible at runtime.'
    Write-Ok 'Existing facade anchors preserved.'

    # ========================================================
    # 8. POST-WRITE VALIDATION
    # ========================================================

    Write-Step '[8/10] Validating generated main.js...'

    $GeneratedSource =
        Get-Content `
            -LiteralPath $MainPath `
            -Raw `
            -Encoding UTF8

    $Checks = @{

        'Spatial start marker' =
            'THREE_SUNLIGHT_TRUE_SPATIAL_CITY_START'

        'Spatial end marker' =
            'THREE_SUNLIGHT_TRUE_SPATIAL_CITY_END'

        'Spatial city diagnostic' =
            'threeSunlightSpatialCity'

        'Chunk configuration' =
            'maxActiveChunks'

        'Startup chunk configuration' =
            'startupChunks'

        'Activation throttle' =
            'activationPerPass'

        'Spatial chunk creation' =
            'CompiledCitySpatialChunk_'

        'InstancedMesh creation' =
            'new THREE.InstancedMesh'

        'Facade cleanup' =
            'compiledCityDeactivateFacade'

        'Animation function' =
            'function animate()'

        'WebGPU renderer' =
            "three/webgpu"
    }

    foreach (
        $Name in $Checks.Keys
    ) {

        if (
            -not $GeneratedSource.Contains(
                $Checks[$Name]
            )
        ) {

            Restore-Backup

            Fail "Generated source validation failed: $Name"
        }

        Write-Ok $Name
    }

    $StartCount =
        (
            [regex]::Matches(
                $GeneratedSource,
                [regex]::Escape(
                    '/* THREE_SUNLIGHT_TRUE_SPATIAL_CITY_START */'
                )
            )
        ).Count

    $EndCount =
        (
            [regex]::Matches(
                $GeneratedSource,
                [regex]::Escape(
                    '/* THREE_SUNLIGHT_TRUE_SPATIAL_CITY_END */'
                )
            )
        ).Count

    if (
        $StartCount -ne 1
    ) {

        Restore-Backup

        Fail "Expected exactly one spatial start marker; found $StartCount."
    }

    if (
        $EndCount -ne 1
    ) {

        Restore-Backup

        Fail "Expected exactly one spatial end marker; found $EndCount."
    }

    Write-Ok 'Exactly one spatial city installer block.'

    # ========================================================
    # 9. BUILD
    # ========================================================

    Write-Step '[9/10] Running production build...'

    Push-Location $ProjectRoot

    try {

        & npm run build

        if (
            $LASTEXITCODE -ne 0
        ) {

            throw "npm run build failed with exit code $LASTEXITCODE."
        }

    }
    catch {

        Write-Host ''
        Write-Host '============================================================' -ForegroundColor Red
        Write-Host 'BUILD FAILED - ROLLING BACK' -ForegroundColor Red
        Write-Host '============================================================' -ForegroundColor Red

        Write-Host $_.Exception.Message -ForegroundColor Red

        Pop-Location

        Restore-Backup

        throw
    }

    Pop-Location

    Write-Ok 'npm run build completed successfully.'

    # ========================================================
    # 10. FINISH
    # ========================================================

    Write-Step '[10/10] Installation complete.'

    if (
        Test-Path -LiteralPath $NodeHelperPath
    ) {

        Remove-Item `
            -LiteralPath $NodeHelperPath `
            -Force `
            -ErrorAction SilentlyContinue
    }

    Write-Host ''
    Write-Host '============================================================' -ForegroundColor Green
    Write-Host ' THREE SUNLIGHT - SPATIAL CITY INSTALLATION COMPLETE' -ForegroundColor Green
    Write-Host '============================================================' -ForegroundColor Green
    Write-Host ''

    Write-Host 'Installed:' -ForegroundColor White
    Write-Host ''
    Write-Host '  [OK] Real spatial InstancedMesh chunks'
    Write-Host '  [OK] 6 x 6 city cells per chunk'
    Write-Host '  [OK] Maximum 5 visible chunks'
    Write-Host '  [OK] Only 2 chunks at startup'
    Write-Host '  [OK] One new chunk per loading pass'
    Write-Host '  [OK] Distant chunk release'
    Write-Host '  [OK] Shared BoxGeometry'
    Write-Host '  [OK] Lightweight MeshBasicMaterial'
    Write-Host '  [OK] Vibrant instance colors'
    Write-Host '  [OK] Building shadows disabled'
    Write-Host '  [OK] Renderer pixel ratio capped at 1.15'
    Write-Host '  [OK] Maximum 6 active facade buildings'
    Write-Host '  [OK] Throttled facade CanvasTexture animation'
    Write-Host '  [OK] Proper facade texture disposal'
    Write-Host '  [OK] Maximum 8 floating building numbers'
    Write-Host '  [OK] Existing WebGPU architecture preserved'
    Write-Host '  [OK] Production build passed'
    Write-Host ''

    Write-Host 'Backup:' -ForegroundColor Yellow
    Write-Host "  $BackupPath"
    Write-Host ''

    Write-Host 'Runtime diagnostic available in browser console:' -ForegroundColor Cyan
    Write-Host ''
    Write-Host '  threeSunlightSpatialCity.stats()'
    Write-Host ''
    Write-Host 'You should see something similar to:' -ForegroundColor DarkGray
    Write-Host ''
    Write-Host '  totalBuildings: 4809+'
    Write-Host '  totalChunks: approximately 150+'
    Write-Host '  activeChunks: never above 5'
    Write-Host '  maxActiveChunks: 5'
    Write-Host '  startupChunks: 2'
    Write-Host '  activationPerPass: 1'
    Write-Host ''

    Write-Host 'IMPORTANT:' -ForegroundColor Yellow
    Write-Host 'After starting Vite, open the browser console and run:'
    Write-Host ''
    Write-Host '  threeSunlightSpatialCity.stats()'
    Write-Host ''
    Write-Host 'The critical value is activeChunks. It should stay at or below 5.'
    Write-Host ''

}
catch {

    Write-Host ''
    Write-Host '============================================================' -ForegroundColor Red
    Write-Host '                 INSTALLATION FAILED' -ForegroundColor Red
    Write-Host '============================================================' -ForegroundColor Red
    Write-Host ''

    Write-Host $_.Exception.Message -ForegroundColor Red

    Write-Host ''

    if (
        Test-Path -LiteralPath $BackupPath
    ) {

        Write-Host 'Backup remains available:' -ForegroundColor Yellow
        Write-Host "  $BackupPath" -ForegroundColor Yellow
    }

    if (
        Test-Path -LiteralPath $NodeHelperPath
    ) {

        Remove-Item `
            -LiteralPath $NodeHelperPath `
            -Force `
            -ErrorAction SilentlyContinue
    }

    exit 1
}