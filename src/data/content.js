export const profile = {
  name: 'Yishan',
  cnName: '李一山',
  role: '产品 & 用户体验设计',
  since: 2010,
  epigraph: 'Ambition is like mass. The more you have, the stronger your gravitational pull.',
  motto: '持续阅读，持续思考',
  intro: [
    '2004 年起，我从在线社区的运营与治理开始接触互联网，逐渐走向网页设计。2010 年正式以设计为职业，此后延展到更多互联网产品与用户体验设计项目，在用户体验与用户研究上持续积累。多年来，我带领团队完成了不同行业、不同业态的项目，其中不少是从 0 到 1 搭建起来的。',
    '在这个过程中，我在消费者行为、行业调研、产品生命周期与供应链方面积累了较多经验，在数据分析与可视化上也有一些心得。近几年，我第一时间投入 AI 领域，探索它的应用场景，并在实际工作与项目中持续实践。',
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
  // Items with their own `href` link out to posts published elsewhere;
  // `via` names the platform and `date` (MM-DD) stands in for the number.
  groups: [
    {
      year: 2026,
      items: [
        {
          title: '我让 K3、Sol 和 Fable 将游戏原型做成了游戏，它们玩了一百万局后说：不好玩',
          date: '07-24',
          via: '公众号',
          href: 'https://mp.weixin.qq.com/s/E3A2_O5_ylSv9-4TO2eUZQ',
        },
      ],
    },
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
      external: Boolean(e.href),
      href: e.href ?? encodeURI(`/essays/${essaySlug(e.no, e.title)}`),
    })),
  })),
};

export const references = [
  {
    label: 'UX',
    title: '用户体验定律',
    desc: '基于 Jon Yablonski 的 Laws of UX，结合工作经验整理的中文版本，并根据行业发展补充国内应用与服务的 UX 案例。',
    href: encodeURI('/UX/16-UX-Laws/用户体验定律'),
  },
  {
    label: 'ACCESSIBILITY',
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

export const projects = {
  title: '兴趣项目',
  about: '出于兴趣做的东西，有在线工具，也有浏览器扩展和硬件配套工具。',
  items: [
    {
      name: 'Cover-Arts 玩法管理器',
      domain: 'calm.yishan.app',
      desc: '为 AI Passport 设备管理玩法库：在浏览器里连接设备，给每个玩法配置名称与封面，并按固件大小自动分配存储空间。',
      href: 'https://calm.yishan.app',
    },
    {
      name: 'Doutify',
      domain: 'doutify.yishan.app',
      desc: '连接 Spotify 与豆瓣音乐的 Chrome 扩展，搜索专辑后一键将元数据与封面填入豆瓣提交表单。',
      href: 'https://doutify.yishan.app',
    },
    {
      name: '粤拼转换器',
      domain: 'jyutping.cc',
      desc: '将繁简汉字即时转换为粤拼等 11 种广东话拼音方案，支持词语分词与多音字选字，全部在浏览器本地运算。',
      href: 'https://jyutping.cc',
    },
    {
      name: 'UPC Finder',
      domain: 'upc.yishan.app',
      desc: '音乐 UPC 编码查询工具，按专辑、艺人或发行名称搜索并比对不同版本，基于 Spotify 目录数据快速复制编码。',
      href: 'https://upc.yishan.app',
    },
    {
      name: '宝可即图鉴 Pokéji',
      domain: 'pokeji.com',
      desc: '把你的即刻主页变成一张宝可梦风格的收藏卡牌，捕捉属于你的专属宝可即。',
      href: 'https://www.pokeji.com',
    },
    {
      name: '图片拼接助手',
      domain: 'tu.yishan.app',
      desc: '在线将多张图片无缝拼接成一张长图，支持拖拽与粘贴上传，无需下载安装。',
      href: 'https://tu.yishan.app',
    },
    {
      name: '联行号查询工具',
      domain: 'bank.yishan.app',
      desc: '中国银行联行号（CNAPS）在线查询，支持按关键词与省、市、区县筛选。',
      href: 'https://bank.yishan.app',
    },
  ],
};

export const lab = {
  about: '从 X 书签和 GitHub 星标里挑出有意思的技术，动手做成可以打开的 demo。',
  href: 'https://li.yishan.app/',
  domain: 'li.yishan.app',
  limit: 6,
};

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
