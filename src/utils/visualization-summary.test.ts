import { describe, it, expect, vi, beforeEach } from 'vitest';
import { displayVisualizationSummary } from './visualization-summary';
import type { VisualizationConfig } from './json-file-parser';

describe('Visualization Summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('displayVisualizationSummary', () => {
    it('should display hub name', () => {
      const contentTypes: Amplience.ContentType[] = [
        {
          contentTypeUri: 'https://schema.example.com/type1.json',
          settings: { label: 'Type 1' },
        } as Amplience.ContentType,
      ];
      const config: VisualizationConfig = {
        visualizations: [
          {
            label: 'Preview',
            templatedUri: '{{ORIGIN_REPLACE}}/preview',
          },
        ],
      };
      const hubName = 'DEV';

      displayVisualizationSummary(contentTypes, config, hubName);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('DEV'));
    });

    it('should display content type count', () => {
      const contentTypes: Amplience.ContentType[] = [
        {
          contentTypeUri: 'https://schema.example.com/type1.json',
          settings: { label: 'Type 1' },
        } as Amplience.ContentType,
        {
          contentTypeUri: 'https://schema.example.com/type2.json',
          settings: { label: 'Type 2' },
        } as Amplience.ContentType,
      ];
      const config: VisualizationConfig = {
        visualizations: [
          {
            label: 'Preview',
            templatedUri: '{{ORIGIN_REPLACE}}/preview',
          },
        ],
      };
      const hubName = 'DEV';

      displayVisualizationSummary(contentTypes, config, hubName);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('2'));
    });

    it('should display each content type label and URI', () => {
      const contentTypes: Amplience.ContentType[] = [
        {
          contentTypeUri: 'https://schema.example.com/type1.json',
          settings: { label: 'Type 1' },
        } as Amplience.ContentType,
      ];
      const config: VisualizationConfig = {
        visualizations: [
          {
            label: 'Preview',
            templatedUri: '{{ORIGIN_REPLACE}}/preview',
          },
        ],
      };
      const hubName = 'DEV';

      displayVisualizationSummary(contentTypes, config, hubName);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Type 1'));
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('https://schema.example.com/type1.json')
      );
    });

    it('should display visualization count', () => {
      const contentTypes: Amplience.ContentType[] = [
        {
          contentTypeUri: 'https://schema.example.com/type1.json',
          settings: { label: 'Type 1' },
        } as Amplience.ContentType,
      ];
      const config: VisualizationConfig = {
        visualizations: [
          {
            label: 'Preview',
            templatedUri: '{{ORIGIN_REPLACE}}/preview',
          },
          {
            label: 'Live View',
            templatedUri: '{{ORIGIN_REPLACE}}/live',
          },
        ],
      };
      const hubName = 'DEV';

      displayVisualizationSummary(contentTypes, config, hubName);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('2'));
    });

    it('should display each visualization label', () => {
      const contentTypes: Amplience.ContentType[] = [
        {
          contentTypeUri: 'https://schema.example.com/type1.json',
          settings: { label: 'Type 1' },
        } as Amplience.ContentType,
      ];
      const config: VisualizationConfig = {
        visualizations: [
          {
            label: 'Preview',
            templatedUri: '{{ORIGIN_REPLACE}}/preview',
          },
          {
            label: 'Live View',
            templatedUri: '{{ORIGIN_REPLACE}}/live',
          },
        ],
      };
      const hubName = 'DEV';

      displayVisualizationSummary(contentTypes, config, hubName);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Preview'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Live View'));
    });

    it('should display visualization templatedUri', () => {
      const contentTypes: Amplience.ContentType[] = [
        {
          contentTypeUri: 'https://schema.example.com/type1.json',
          settings: { label: 'Type 1' },
        } as Amplience.ContentType,
      ];
      const config: VisualizationConfig = {
        visualizations: [
          {
            label: 'Preview',
            templatedUri: '{{ORIGIN_REPLACE}}/preview?id={{contentItemId}}',
          },
        ],
      };
      const hubName = 'DEV';

      displayVisualizationSummary(contentTypes, config, hubName);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('{{ORIGIN_REPLACE}}/preview?id={{contentItemId}}')
      );
    });

    it('should display default indicator for default visualization', () => {
      const contentTypes: Amplience.ContentType[] = [
        {
          contentTypeUri: 'https://schema.example.com/type1.json',
          settings: { label: 'Type 1' },
        } as Amplience.ContentType,
      ];
      const config: VisualizationConfig = {
        visualizations: [
          {
            label: 'Preview',
            templatedUri: '{{ORIGIN_REPLACE}}/preview',
            default: true,
          },
        ],
      };
      const hubName = 'DEV';

      displayVisualizationSummary(contentTypes, config, hubName);

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('default'));
    });

    it('should use contentTypeUri when label is not available', () => {
      const contentTypes: Amplience.ContentType[] = [
        {
          contentTypeUri: 'https://schema.example.com/type1.json',
        } as Amplience.ContentType,
      ];
      const config: VisualizationConfig = {
        visualizations: [
          {
            label: 'Preview',
            templatedUri: '{{ORIGIN_REPLACE}}/preview',
          },
        ],
      };
      const hubName = 'DEV';

      displayVisualizationSummary(contentTypes, config, hubName);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('https://schema.example.com/type1.json')
      );
    });

    it('should handle single content type with single visualization', () => {
      const contentTypes: Amplience.ContentType[] = [
        {
          contentTypeUri: 'https://schema.example.com/type1.json',
          settings: { label: 'Type 1' },
        } as Amplience.ContentType,
      ];
      const config: VisualizationConfig = {
        visualizations: [
          {
            label: 'Preview',
            templatedUri: '{{ORIGIN_REPLACE}}/preview',
          },
        ],
      };
      const hubName = 'PROD';

      displayVisualizationSummary(contentTypes, config, hubName);

      expect(console.log).toHaveBeenCalled();
    });

    it('should handle multiple content types with multiple visualizations', () => {
      const contentTypes: Amplience.ContentType[] = [
        {
          contentTypeUri: 'https://schema.example.com/type1.json',
          settings: { label: 'Type 1' },
        } as Amplience.ContentType,
        {
          contentTypeUri: 'https://schema.example.com/type2.json',
          settings: { label: 'Type 2' },
        } as Amplience.ContentType,
        {
          contentTypeUri: 'https://schema.example.com/type3.json',
          settings: { label: 'Type 3' },
        } as Amplience.ContentType,
      ];
      const config: VisualizationConfig = {
        visualizations: [
          {
            label: 'Preview',
            templatedUri: '{{ORIGIN_REPLACE}}/preview',
            default: true,
          },
          {
            label: 'Live View',
            templatedUri: '{{ORIGIN_REPLACE}}/live',
          },
          {
            label: 'Debug',
            templatedUri: '{{ORIGIN_REPLACE}}/debug',
          },
        ],
      };
      const hubName = 'STAGING';

      displayVisualizationSummary(contentTypes, config, hubName);

      expect(console.log).toHaveBeenCalled();
    });
  });
});
