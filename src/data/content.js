export const profile = {
  name: 'Yishan',
  cnName: '壹山',
  role: '产品 & 用户体验设计',
  since: 2010,
  epigraph: 'Ambition is like mass. The more you have, the stronger your gravitational pull.',
  motto: '持续阅读，持续思考',
  intro: [
    '从 2010 年开始接触网页设计，并延展到更多互联产品设计项目，逐渐对用户体验设计与用户研究感兴趣，同时也在工作中带领团队完成多个项目。',
    '在过程中我认为自己对消费者行为习惯、产品生命周期以及供应链等方面积累了稍多的经验。这两年我开始接触数据分析与可视化方面的内容，也在观察 AI 行业的发展与相关的机会。',
  ],
};

export const products = [2021, 2022, 2023, 2024, 2025].map((year) => ({
  year,
  href: `/products/${year}`,
}));

export const newsletter = {
  title: '有所启发',
  subscribe: 'https://ai.yishan.li/',
  about:
    '关注令我产生好奇与兴趣的跨领域内容，包含但不限于科学技术、产品设计、人机交互，社会人文与现实生活中会遇到的问题。',
  issues: [
    { no: '011', title: '三体，群星，扁平化的算法与 Spotify' },
    { no: '010', title: 'AI 足球战术，Inflection AI 转型，网络重复内容，失去色彩的世界是对个性化的告别' },
    { no: '009', title: 'Midjourney，Devin，Apple & Google，AI 时代的交互设计，以及更喜欢你使用鼻呼吸的大脑' },
    { no: '008', title: 'Claude 3, Inflection-2.5, OpenAI and Musk' },
    { no: '007', title: '适老化设计，以及空间改善思维' },
    { no: '006', title: '挑战权威，惯性调侃，良好午休，劳动错觉，以及一些AI资讯' },
    { no: '005', title: '用户体验监管，Sora，空间视频价值，AI 聊天机器人法律责任与无障碍设计' },
    { no: '004', title: 'Arc Search，PH 2023 年度产品，设计的秘诀，餐饮趋势和延迟满足' },
    { no: '003', title: '苹果欧盟新规，反AI艺术工具，更便宜的人工支出，以及最大摄氧量' },
    { no: '002', title: 'Meta，Arc Browser，苹果税，作为装饰的图书以及抢夺注意力的路牌' },
    { no: '001', title: 'GPT store，Rabbit r1，Quora 以及超级 AI 的长期价值分歧' },
  ].map((i) => ({
    ...i,
    href: `https://ai.yishan.li/p/astra-inspired-${i.no}?r=e6ngw`,
  })),
};

const essaySlug = (no, title) => `${no}-${title.replaceAll(' ', '-')}`;

export const essays = {
  title: '但说无妨',
  about: '关于产品、交互、用户体验、项目管理以及阅读内容的一些见解。',
  groups: [
    {
      year: 2023,
      items: [
        { no: '024', title: '语言是连接过去、现在和未来的纽带' },
        { no: '023', title: '边缘用例与 Poka-Yoke' },
        { no: '022', title: '产品管理的第一性原则' },
      ],
    },
    {
      year: 2022,
      items: [
        { no: '021', title: '问题背后的问题' },
        { no: '020', title: '提出好的问题' },
        { no: '019', title: '心流' },
        { no: '018', title: '能力模型' },
        { no: '017', title: '观点与实践' },
        { no: '016', title: '过时的书籍' },
        { no: '015', title: '放弃与止损' },
        { no: '014', title: '信息会找到属于它的媒介' },
        { no: '013', title: 'Job-ready 教学框架' },
        { no: '012', title: '社区生态与竞争力' },
        { no: '011', title: '以教促学' },
        { no: '010', title: '分享与交流' },
        { no: '009', title: 'Power & Points' },
        { no: '008', title: '产品经理培训与从业' },
        { no: '007', title: '个人与组织进化' },
        { no: '006', title: '独特性与真实性' },
        { no: '005', title: '用户与策略' },
        { no: '004', title: '奖赏你的好奇心' },
        { no: '003', title: '练习，能力边界与原则' },
        { no: '002', title: '流程与交付' },
        { no: '001', title: '项目管理' },
      ],
    },
  ].map((g) => ({
    ...g,
    items: g.items.map((e) => ({
      ...e,
      href: encodeURI(`/essays/${essaySlug(e.no, e.title)}`),
    })),
  })),
};

export const references = [
  {
    label: 'REFERENCE',
    title: '用户体验定律',
    desc: '基于 Jon Yablonski 的 Laws of UX，结合工作经验整理的中文版本，并根据行业发展补充国内应用与服务的 UX 案例。',
    href: encodeURI('/UX/16-UX-Laws/用户体验定律'),
  },
  {
    label: 'REFERENCE',
    title: 'ADE 无障碍动态元素',
    desc: '8 种常见页面动态元素在可用性和易用性方面的问题，以及可参考的最佳实践 — COMPARE 项目资料的中文翻译整理。',
    href: encodeURI('/UX/ADE/什么是-ADE'),
  },
  {
    label: 'DATA',
    title: 'DataCamp 专业数据分析认证',
    desc: '拿到 DataCamp 数据分析专业认证的完整记录，对了解数据分析领域帮助很大。',
    href: '/datacamp',
  },
];

export const contacts = [
  { label: '公众号', value: 'impm013', href: null },
  { label: 'Medium', value: 'm.yishan.li', href: 'https://m.yishan.li/' },
  { label: 'Newsletter', value: 'ai.yishan.li', href: 'https://ai.yishan.li/' },
  {
    label: '小红书',
    value: 'Yishan 壹山',
    href: 'https://www.xiaohongshu.com/user/profile/5c0cd528f7e8b95f0e136e35',
  },
];
