export default {
  logo: <strong>IDP Platform Docs</strong>,
  project: { link: '#' },
  docsRepositoryBase: '#',
  footer: { text: 'Internal Developer Platform' },
  sidebar: { defaultMenuCollapseLevel: 1 },
  toc: { float: true },
  useNextSeoProps() {
    return { titleTemplate: '%s – IDP Platform' };
  },
};
