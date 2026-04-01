import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Docusaurus Plugin',
      items: [
        'installation',
        'configuration',
        'ai-agent-setup',
        'using-comments',
      ],
    },
    {
      type: 'category',
      label: 'CLI Tool',
      items: [
        'cli/intro',
        'cli/installation',
        'cli/configuration',
        'cli/ai-agent-setup',
      ],
    },
  ],
};

export default sidebars;
