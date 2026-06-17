

export const aboutPoints = [
  {
    title: '分层培养',
    description: '开发、艺术、算法都有对应的成长路径，新手也能逐步进入状态。'
  },
  {
    title: '项目实战',
    description: '参与真实项目和作品制作，把兴趣转化成可展示的成果。'
  },
  {
    title: '导师指导',
    description: '围绕方向学习、流程协作和作品打磨提供持续支持。'
  },
  {
    title: '成果沉淀',
    description: '兼顾作品集、竞赛、论文和场景落地，帮助能力持续成长。'
  }
];

export const directionCards = [
  {
    id: 'ue-section',
    key: 'ue',
    tag: 'Direction 01',
    icon: '🎮',
    title: 'UE互动开发',
    summary: 'UE5 / VR / 数字孪生 / 实时交互'
  },
  {
    id: 'ai-section',
    key: 'ai',
    tag: 'Direction 02',
    icon: '🎬',
    title: 'AI影视创作',
    summary: '生成式AI / 短剧 / 宣传片 / 视觉表达'
  },
  {
    id: 'research-section',
    key: 'research',
    tag: 'Direction 03',
    icon: '🧠',
    title: '人工智能研究',
    summary: '算法 / 竞赛 / 论文 / 场景落地'
  }
];

export const directionSections = [
  {
    id: 'ue-section',
    key: 'ue',
    accentClass: 'theme-ue',
    label: '技术方向 01',
    title: 'UE互动开发',
    description:
      '聚焦 UE5 实时交互、VR 体验和数字孪生可视化，面向文旅展示、校园导览、沉浸式培训等实际场景开展项目开发。',
    projects: [
      {
        detailId: 'ue-campus-digital-twin',
        title: '校园数字孪生可视化平台',
        description:
          '基于 UE5 构建教学楼、实验室与设备状态联动的数字孪生演示系统，用于空间展示与场景讲解。',
        preview: '校园数字孪生'
      },
      {
        detailId: 'ue-vr-experience',
        title: '沉浸式 VR 互动体验',
        description:
          '围绕校史馆与实训课程设计多人交互流程，完成场景搭建、UI 交互和设备适配。',
        preview: 'VR 交互体验'
      }
    ],
    mentors: [
      {
        name: '杨振樱 & 谢文智',
        role: '核心 UE 开发',
        description: '负责游戏逻辑与系统架构，带领团队完成多个UE项目开发。'
      },
      {
        name: '代一凡',
        role: '资深美术建模',
        description: '负责高品质资产与场景构建，打造沉浸式虚拟体验。'
      }
    ]
  },
  {
    id: 'ai-section',
    key: 'ai',
    accentClass: 'theme-ai',
    label: '技术方向 02',
    title: 'AI影视创作',
    description:
      '聚焦生成式 AI、短剧与宣传片制作，打通脚本策划、分镜设计、画面生成、剪辑包装到成片发布的完整流程。',
    projects: [
      {
        detailId: 'ai-return-to-ruins',
        title: '归墟令',
        description: 'AI影视创作项目作品展示，卡片内自动静音预览视频内容。',
        preview: '归墟令',
        isVideoPlaceholder: true
      },
      {
        detailId: 'ai-campus-short-drama',
        title: '校园主题 AI 短剧实验',
        description:
          '围绕校园故事设计脚本与分镜，使用 AIGC 进行角色生成、镜头拼接与后期配音。',
        preview: '生成式短剧'
      }
    ],
    mentors: [
      {
        name: '马庆宇',
        role: '金牌编剧',
        description: '负责创意剧本与深度叙事，为AI影视注入故事灵魂，指导学生完成多部原创短片。'
      },
      {
        name: '庞凯文',
        role: 'AI 视频专家',
        description: '负责生成式视频全流程制作，让AI成为摄影机和特效师，带队冲击AI创作竞赛。'
      }
    ]
  },
  {
    id: 'research-section',
    key: 'research',
    accentClass: 'theme-research',
    label: '技术方向 03',
    title: '人工智能研究',
    description:
      '围绕算法建模、竞赛训练、论文写作与应用落地展开，强调“从问题定义到实际部署”的完整研究链路。',
    projects: [
      {
        detailId: 'research-vision-competition',
        title: '智能识别竞赛项目',
        description:
          '围绕图像识别与分类任务完成数据清洗、模型训练和结果分析，服务竞赛备赛与答辩展示。',
        preview: '竞赛方案'
      },
      {
        detailId: 'research-campus-ai',
        title: '校园场景 AI 应用落地',
        description:
          '结合问答助手、视觉识别与业务流程优化，探索人工智能在校园服务中的实际应用。',
        preview: '场景落地'
      }
    ],
    mentors: [
      {
        name: '刘天萌',
        role: '',
        description:
          '学术导向：深度研读文献，发表高质量论文。\n竞赛驱动：互联网+、计算机设计大赛指导。\n实战应用：探索 AI 算法的真实场景落地。'
      }
    ]
  }
];

export const recruitPoints = [
  '对技术充满热情，愿意学习新技术',
  '有良好的团队合作精神',
  '有责任心，能够按时完成任务',
  '有一定的编程基础优先'
];

export const recruitSteps = ['提交申请', '面试/笔试', '结果通知', '正式加入'];

export const contactItems = [
  {
    icon: '址',
    title: '地址',
    content: 'XX大学XX校区XX楼406室'
  },
  {
    icon: '邮',
    title: '邮箱',
    content: 'contact@406lab.com'
  },
  {
    icon: '群',
    title: 'QQ群',
    content: '123456789'
  }
];

export const worksPages = {
  ue: {
    label: '技术方向 01',
    title: 'UE互动开发',
    pageTitle: 'UE互动开发作品页',
    description: '仅保留作品预览内容，后续可直接替换为真实封面或演示图。',
    accentClass: 'theme-ue',
    backHash: '#ue-section',
    previews: ['数字孪生', 'VR互动', '虚拟仿真']
  },
  ai: {
    label: '技术方向 02',
    title: 'AI影视创作',
    pageTitle: 'AI影视创作作品页',
    description: '仅保留作品预览内容，后续可直接替换为真实封面或剧照。',
    accentClass: 'theme-ai',
    backHash: '#ai-section',
    previews: ['短片成片', '分镜设计', '宣传案例']
  },
  research: {
    label: '技术方向 03',
    title: '人工智能研究',
    pageTitle: '人工智能研究作品页',
    description: '仅保留作品预览内容，后续可直接替换为真实封面或案例截图。',
    accentClass: 'theme-research',
    backHash: '#research-section',
    previews: ['竞赛获奖', '论文发表', '应用案例']
  }
};
