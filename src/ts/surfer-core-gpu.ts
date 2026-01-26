import 'CindyJS';

import csInitPrefix from 'bundle-text:../cindyscript/init.cindyscript';
import csDraw from 'bundle-text:../cindyscript/draw.cindyscript';
import csMouseDown from 'bundle-text:../cindyscript/mousedown.cindyscript';
import csMouseUp from 'bundle-text:../cindyscript/mouseup.cindyscript';

import PolynomialInterpolation from './algorithms/polynomial-interpolation';

const csInit = `${csInitPrefix}; csInitDone();`;

const cdyInstanceDataMap = new Map<
  CindyJS,
  { onInit: (api: CindyJS.ApiV1) => void }
>();

CindyJS.registerPlugin(1, 'surfer-js-core-gpu', (api) => {
  const cdy = api.instance;
  const cdyData = cdyInstanceDataMap.get(cdy);

  if (typeof cdyData === 'undefined')
    throw new Error('Unknown CindyJS instance.');

  const { onInit } = cdyData;
  api.defineFunction('csInitDone', 0, () => onInit(api));
});

export default class SurferCoreGpu {
  protected readonly api: CindyJS.ApiV1;

  protected readonly cdy: CindyJS;

  public readonly element: HTMLElement;

  public readonly canvas: HTMLCanvasElement;

  protected algorithm: PolynomialInterpolation;

  protected expression = 'x^2 - 1';

  protected twoSided = true;

  protected alpha = 1.0;

  protected zoom = 1.0;

  protected parameters: { [key: string]: number } = {};

  protected colors: number[][] = [
    [0.3, 0.5, 1.0],      // Light 1: Light blue
    [0.5, 1.0, 1.0],      // Light 2: Cyan
    [1.0, 0.2, 0.1],      // Light 3: Red
    [1.0, 1.0, 0.5],      // Light 4: Yellow
    [0.63, 0.72, 0.27],   // Light 5: Yellowish green
    [0.54, 0.09, 0.54],   // Light 6: Purple
  ];

  public static readonly Algorithms: {
    readonly PolynomialInterpolation: typeof PolynomialInterpolation;
  } = {
      PolynomialInterpolation,
    };

  private constructor(
    api: CindyJS.ApiV1,
    element: HTMLElement,
    canvas: HTMLCanvasElement,
  ) {
    this.api = api;
    this.cdy = api.instance;
    this.element = element;
    this.canvas = canvas;

    const interpolationNodeGenerator =
      PolynomialInterpolation.nodeGeneratorChebyshev();
    this.algorithm = new PolynomialInterpolation(interpolationNodeGenerator, 7);

    this.defineCindyScriptFunctions();

    this.setAlgorithm(this.algorithm);
    this.setExpression(this.expression);
    this.setTwoSided(this.twoSided);
    this.setAlpha(this.alpha);
    this.setZoom(this.zoom);
    this.updateColorsInCindyScript();

    Object.entries(this.parameters).forEach(([name, value]) =>
      this.setParameter(name, value),
    );
  }

  private defineCindyScriptFunctions(): void {
    const toCSTypeListOfNumbers = (a: number[]) => ({
      ctype: 'list',
      value: a.map((e) => ({ ctype: 'number', value: { real: e, imag: 0 } })),
    });
    const getInterpolationNodesCS = (args: unknown[]) => {
      const degree = this.api.evaluateAndVal<CindyJS.Number>(args[0]).value
        .real;
      const nodes = this.getAlgorithm().generateNodes(degree);
      return toCSTypeListOfNumbers(nodes);
    };
    this.api.defineFunction(
      'getInterpolationNodes',
      1,
      getInterpolationNodesCS,
    );
  }

  getAlgorithm(): PolynomialInterpolation {
    return this.algorithm;
  }

  getExpression(): string {
    return this.expression;
  }

  getTwoSided(): boolean {
    return this.twoSided;
  }

  getAlpha(): number {
    return this.alpha;
  }

  getZoom(): number {
    return this.zoom;
  }

  getParameter(name: string): number | undefined {
    return this.parameters[name];
  }

  getParameters(): { [key: string]: number } {
    return { ...this.parameters };
  }

  getColors(): number[][] {
    return this.colors.map((c) => [...c]);
  }

  getLightColor(lightIndex: number): number[] | undefined {
    if (lightIndex < 0 || lightIndex >= this.colors.length) return undefined;
    return [...this.colors[lightIndex]];
  }

  getParameterNames(): string[] {
    return Object.keys(this.parameters);
  }

  setExpression(expression: string): this {
    this.expression = expression;
    this.cdy.evokeCS(`fun(x,y,z) := (${expression}); init();`);
    return this;
  }

  setTwoSided(hasTwoSides: boolean): this {
    this.twoSided = hasTwoSides;
    this.cdy.evokeCS(`hasTwoSides = (${hasTwoSides ? 'true' : 'false'});`);
    return this;
  }

  setAlpha(alpha: number): this {
    this.alpha = alpha;
    this.cdy.evokeCS(`alpha = (${alpha});`);
    return this;
  }

  setZoom(zoom: number): this {
    this.zoom = zoom;
    this.cdy.evokeCS(`zoom = (${zoom});`);
    return this;
  }

  setParameter(name: string, value: number): this {
    this.parameters[name] = value;
    this.cdy.evokeCS(`${name} = (${value});`);
    return this;
  }

  setColors(colors: number[][]): this {
    if (colors.length !== 6) {
      throw new Error('Exactly 6 light colors must be provided');
    }
    this.colors = colors.map((c) => {
      if (c.length !== 3) {
        throw new Error('Each color must have 3 components (RGB)');
      }
      return [...c];
    });
    this.updateColorsInCindyScript();
    return this;
  }

  setLightColor(lightIndex: number, color: number[]): this {
    if (lightIndex < 0 || lightIndex >= 6) {
      throw new Error('Light index must be between 0 and 5');
    }
    if (color.length !== 3) {
      throw new Error('Color must have 3 components (RGB)');
    }
    this.colors[lightIndex] = [...color];
    this.updateColorsInCindyScript();
    return this;
  }

  setPrimaryColor(color: number[]): this {
    if (color.length !== 3) {
      throw new Error('Color must have 3 components (RGB)');
    }
    // Primary color controls lights 0 and 1 (back lights)
    this.colors[0] = color.map((c) => c * 0.6);
    this.colors[1] = [...color];
    this.updateColorsInCindyScript();
    return this;
  }

  setAccentColor(color: number[]): this {
    if (color.length !== 3) {
      throw new Error('Color must have 3 components (RGB)');
    }
    // Accent color controls lights 2 and 3 (front lights)
    this.colors[2] = color.map((c) => c * 0.8);
    this.colors[3] = [...color];
    this.updateColorsInCindyScript();
    return this;
  }

  setSecondaryColor(color: number[]): this {
    if (color.length !== 3) {
      throw new Error('Color must have 3 components (RGB)');
    }
    // Secondary color controls lights 4 and 5 (side lights)
    this.colors[4] = color.map((c) => c * 0.9);
    this.colors[5] = color.map((c) => c * 0.85);
    this.updateColorsInCindyScript();
    return this;
  }

  private updateColorsInCindyScript(): void {
    const csColors = this.colors
      .map((c) => `(${c[0]}, ${c[1]}, ${c[2]})`)
      .join(', ');
    this.cdy.evokeCS(`colors = [${csColors}];`);
  }

  setAlgorithm(algorithm: PolynomialInterpolation) {
    this.algorithm = algorithm;
    this.cdy.evokeCS(`init();`);
  }

  static async create(
    container: HTMLElement,
    width = 256,
    height = 256,
  ): Promise<SurferCoreGpu> {
    const canvas = container.ownerDocument.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    container.appendChild(canvas);

    const cdy = CindyJS.newInstance({
      scripts: {
        init: csInit,
        draw: csDraw,
        mousedown: csMouseDown,
        mouseup: csMouseUp,
      },
      animation: { autoplay: false },
      use: ['CindyGL', 'symbolic', 'surfer-js-core-gpu'],
      ports: [
        {
          element: canvas,
          transform: [{ visibleRect: [-0.51, -0.51, 0.51, 0.51] }],
        },
      ],
    });

    return new Promise<SurferCoreGpu>((resolve) => {
      const onInit = (api: CindyJS.ApiV1) => {
        const element = canvas.parentElement;
        if (element === null)
          throw new Error(
            'Something went wrong during startup of Cinderella applet',
          );

        // keep the internal and external aspect ratio in sync
        const resizeObserver = new ResizeObserver(() => {
          const aspectRatio = canvas.width / canvas.height;
          cdy.evokeCS(`aspectRatio = ${aspectRatio};`);
        });
        resizeObserver.observe(canvas);

        const surferCoreGpu = new SurferCoreGpu(api, element, canvas);
        resolve(surferCoreGpu);
      };

      cdyInstanceDataMap.set(cdy, { onInit });
      cdy.startup();
    });
  }
}
