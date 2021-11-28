const { description } = require('../../package')

module.exports = {
  /**
   * Ref：https://v1.vuepress.vuejs.org/config/#title
   */
  title: 'Portfolio',
  /**
   * Ref：https://v1.vuepress.vuejs.org/config/#description
   */
  description: "Luke Baber",
  base: "/portfolio-site/",

  /**
   * Extra tags to be injected to the page HTML `<head>`
   *
   * ref：https://v1.vuepress.vuejs.org/config/#head
   */
  head: [
    ['meta', { name: 'theme-color', content: '#3eaf7c' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' }]
  ],

  /**
   * Theme configuration, here is the default theme configuration for VuePress.
   *
   * ref：https://v1.vuepress.vuejs.org/theme/default-theme-config.html
   */
  themeConfig: {
    repo: '',
    editLinks: false,
    docsDir: '',
    editLinkText: '',
    lastUpdated: false,
    nav: [
      {
        text: 'About',
        link: '/about/introduction',
      }
    ],
    sidebar: {
            '/': [
                {
                    title: 'About',
                    collapsable: false,
                    children: [
                        'about/introduction',
                        'about/education'
                    ]
                },
                {
                    title: 'CAD Projects',
                    collapsable: false,
                    children: [
                        'cad/door-lock'
                    ]
                },
                {
                    title: 'Code Projects',
                    collapsable: false,
                    children: [
                        'code/seam-carving',
                    ]
                },
                {
                    title: 'Electronic Projects',
                    collapsable: false,
                    children: [
                        'electronics/rgb-lights',
                    ]
                }
            ],
        }
  },

  /**
   * Apply plugins，ref：https://v1.vuepress.vuejs.org/zh/plugin/
   */
  plugins: [
    '@vuepress/plugin-back-to-top',
    '@vuepress/plugin-medium-zoom',
  ]
}
