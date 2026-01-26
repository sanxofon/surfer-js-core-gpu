# surfer-core-gpu (with color customization)

This is a color customization fork of the original [IMAGINARY](https://github.com/imaginary) repository.

The original package provides a WebGL (actually, CindyJS and CindyGL) based renderer for
algebraic surfaces. It can also be used for other types of implicit surfaces.
However, the quality of the results may vary a lot.

Check out the UPDATED [demo](https://sanxofon.github.io/surfer-js-core-gpu/demo.html) with color selectors.

## Color Customization

The renderer uses 6 light sources to illuminate the surface. You can customize the colors using either the simplified key-color API or control individual lights directly.

**Key Colors (Recommended):**

```typescript
// Set primary color (controls back lighting - lights 0-1)
s.setPrimaryColor([0.3, 0.5, 1.0]);  // Blue

// Set accent color (controls front lighting - lights 2-3)
s.setAccentColor([1.0, 0.2, 0.1]);   // Red

// Set secondary color (controls side lighting - lights 4-5)
s.setSecondaryColor([0.6, 0.7, 0.3]); // Yellowish green
```

**Individual Light Control:**

```typescript
// Set all 6 light colors at once
s.setColors([
  [0.3, 0.5, 1.0],   // Light 0
  [0.5, 1.0, 1.0],   // Light 1
  [1.0, 0.2, 0.1],   // Light 2
  [1.0, 1.0, 0.5],   // Light 3
  [0.63, 0.72, 0.27], // Light 4
  [0.54, 0.09, 0.54]  // Light 5
]);

// Set a single light color
s.setLightColor(0, [1.0, 0.0, 0.0]); // Red for light 0
```

**Get Color Information:**

```typescript
// Get all 6 light colors
const colors = s.getColors();
// Returns: [[r, g, b], [r, g, b], ...]

// Get a specific light color
const color0 = s.getLightColor(0);
// Returns: [r, g, b] or undefined if invalid index
```

**Note:** RGB values should be in the range [0, 1], though values above 1 can be used for HDR-like effects.

## Usage

Add the package to your project:

```shell
npm install @imaginary-maths/surfer-core-gpu
```

Import the main class, instantiate and modify:

```typescript
import '@imaginary-maths/surfer-core-gpu';

// ...

const container = document.getElementById('my-container');
const s = await SurferCoreGpu.create(container, 512, 512);

s.setExpression('x^2+y^2+z^2+x*y*z-4*a');
s.setAlpha(0.75);
s.setZoom(0.1);
s.setParameter('a', 1);

// For translucent surfaces, having the same material for both sides often looks better.
s.setTwoSided(false);
```

Some getters are also available:

```typescript
s.getExpression();
// "x^2+y^2+z^2+x*y*z-4*a"
s.getAlpha();
// 0.75
s.getZoom();
// 0.1
s.getParameterNames();
// ["a"]
s.getParameters();
// { a: 1.0 }
s.getTwoSided();
// false
```

Some elements of the intersection algorithm can be tweaked as well:

```typescript
const PolynomialInterpolation =
  SurferCoreGpu.Algorithms.PolynomialInterpolation;

// For some non-algebraic functions, Chebyshev nodes yield better results.
// Explictly set the maximum degree of the interpolating function for experimentation.
const algorithm0 = new PolynomialInterpolation(
  PolynomialInterpolation.nodeGeneratorChebyshev(),
  11,
);
s.setAlgorithm(algorithm);

// Equidistant nodes are the default and yield good results if the zoom parameter is rather small.
const algorithm1 = new PolynomialInterpolation(
  PolynomialInterpolation.nodeGeneratorEquidistant(),
);
s.setAlgorithm(algorithm1);
```

The `SurferGpuCore` object exposes two internal elements:

- `canvas`: A `HTMLCanvasElement` that is used for drawing the surface. This
  element should not be modified, but its properties can be read safely.
- `element`: A `HTMLDivElement` used as a container for the `canvas`. Additional
  CSS properties such as background color, width and height can be applied to
  this element.

## Bundled CindyJS

This package uses the [CindyJS](https://cindyjs.org) package internally. Since
CindyJS is not published through NPM, you can either add the libraries from the
`vendor` folder to your project manually (via `<script>` tags), or you change
your imports to

```typescript
import '@imaginary-maths/surfer-core-gpu/dist/surfer-core-gpu-bundled-cindyjs';
```

## Build

```shell
npm install
npm run build
```

## Troubleshoot

MAke sure the server is sending the correct MIME type for the .mjs file, failing to do so may cause the browser to block its loading. The problem usually arises because the server is not configured to serve .mjs files with the correct MIME type (text/javascript). In Apache edit `conf/mime.types` and change `js` to `js mjs`.

## Credits

Created by [Christian Stussak](https://github.com/porst17) for IMAGINARY gGmbH,
based on a prototype by [Aaron Montag](https://github.com/montaga).
Color customization / Color wheel by [Santiago Chávez Novaro](https://github.com/sanxofon)

## License

Copyright 2022 IMAGINARY gGmbH

Licensed under the Apache v2.0 license (see the [`LICENSE`](./LICENSE) file).
