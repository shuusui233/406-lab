<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getProjectDetail } from '../api/projects';
import { worksPages } from '../data/site';

const props = defineProps({
  id: {
    type: String,
    required: true
  }
});

const route = useRoute();
const router = useRouter();
const project = ref(null);
const loading = ref(false);
const errorMessage = ref('');

const categoryLabels = {
  ue: 'UE互动开发',
  ai: 'AI影视创作',
  research: '人工智能研究'
};

const typeLabels = {
  interactive: '交互体验',
  vr: 'VR体验',
  simulation: '虚拟仿真',
  video: '视频作品',
  'short-film': '短片创作',
  promo: '宣传内容',
  trailer: '预告片',
  great: '创意实验',
  competition: '竞赛项目',
  application: '应用落地',
  nlp: '自然语言处理',
  'data-analysis': '数据分析'
};

const categoryDetails = {
  ue: {
    summary: '围绕实时交互、空间展示与沉浸式体验进行场景设计和系统开发。',
    highlights: ['实时场景构建与交互逻辑设计', '适配展示、培训或导览等应用场景', '强调体验流程与视觉呈现的统一'],
    scene: '适用于数字孪生、虚拟导览、教学演示和沉浸式交互体验等场景。',
    nextStep: '后续可继续补充封面、交互演示视频与项目拆解内容，形成更完整的作品案例。'
  },
  ai: {
    summary: '聚焦脚本策划、镜头设计、生成式内容制作与成片表达的整合流程。',
    highlights: ['覆盖内容创意到成片输出的完整链路', '强调视觉风格、叙事节奏与生成式工具协同', '适合宣传短片、实验影像与创意视频展示'],
    scene: '适用于宣传片、短剧实验、角色预告、品牌内容和视觉表达类创作场景。',
    nextStep: '后续可接入剧照、分镜、花絮或成片链接，进一步提升项目的可看性与说服力。'
  },
  research: {
    summary: '围绕算法建模、研究训练、竞赛成果与实际应用落地展开项目沉淀。',
    highlights: ['强调问题定义、实验设计与结果分析', '兼顾竞赛训练、论文输出与应用验证', '适合展示研究能力与项目思考过程'],
    scene: '适用于竞赛答辩、论文展示、校园应用探索和智能分析类项目介绍。',
    nextStep: '后续可继续补充实验结果、图表、论文摘要或应用截图，使内容更完整。'
  }
};

const routeCategory = computed(() => {
  const category = String(route.query.category || '').trim();
  return worksPages[category] ? category : '';
});

const page = computed(() => {
  if (project.value?.category && worksPages[project.value.category]) {
    return worksPages[project.value.category];
  }

  if (routeCategory.value) {
    return worksPages[routeCategory.value];
  }

  return null;
});

const homeTargetSection = computed(() => page.value?.backHash?.replace(/^#/, '') || '');

const categoryLabel = computed(() =>
  project.value?.category ? categoryLabels[project.value.category] || project.value.category : ''
);

const typeLabel = computed(() =>
  project.value?.type ? typeLabels[project.value.type] || project.value.type : ''
);

const detailContent = computed(() => {
  if (!project.value?.category) {
    return null;
  }

  return categoryDetails[project.value.category] || null;
});

const projectSummary = computed(() => {
  if (!project.value) {
    return '';
  }

  return project.value.description || detailContent.value?.summary || '项目简介待补充。';
});

const projectMetaItems = computed(() => {
  if (!project.value) {
    return [];
  }

  return [
    { label: '所属方向', value: categoryLabel.value || '未分类' },
    { label: '项目类型', value: typeLabel.value || '项目作品' },
    { label: '展示排序', value: `第 ${project.value.sortOrder} 位` },
    { label: '最近更新', value: formatDate(project.value.updatedAt) }
  ];
});

function formatDate(value) {
  if (!value) {
    return '待补充';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString('zh-CN');
}

function clearBodyClass() {
  document.body.classList.remove(
    'page-works',
    'theme-ue',
    'theme-ai',
    'theme-research',
    'page-home'
  );
  document.body.removeAttribute('data-bg-stage');
}

function applyBodyClass() {
  clearBodyClass();

  if (!page.value) {
    return;
  }

  document.body.classList.add('page-works', page.value.accentClass);
}

function handleGoBack() {
  if (window.history.length > 1) {
    router.back();
    return;
  }

  if (project.value?.category) {
    router.push(`/works/${project.value.category}`);
    return;
  }

  router.push('/');
}

async function loadProjectDetail() {
  loading.value = true;
  errorMessage.value = '';
  project.value = null;

  try {
    project.value = await getProjectDetail(props.id);
    applyBodyClass();
  } catch (error) {
    errorMessage.value = error.message || '作品详情加载失败，请稍后重试。';
    clearBodyClass();
  } finally {
    loading.value = false;
  }
}

watch(
  page,
  () => {
    applyBodyClass();
  },
  { immediate: true }
);

watch(
  () => props.id,
  async () => {
    await loadProjectDetail();
  }
);

onMounted(async () => {
  await loadProjectDetail();
});

onBeforeUnmount(() => {
  clearBodyClass();
});
</script>

<template>
  <main class="page-shell">
    <header class="page-header">
      <div class="brand-block">
        <h1>406实训室</h1>
        <p>{{ page ? `${page.title}作品详情` : '作品详情' }}</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" type="button" @click="handleGoBack">
          返回上一页
        </button>
        <RouterLink
          v-if="homeTargetSection"
          class="btn btn-primary"
          :to="{ path: '/', query: { section: homeTargetSection } }"
        >
          返回首页
        </RouterLink>
        <RouterLink v-else class="btn btn-primary" to="/">
          返回首页
        </RouterLink>
      </div>
    </header>

    <section class="works-section detail-shell">
      <div v-if="loading" class="status-panel">
        正在加载作品详情...
      </div>

      <div v-else-if="errorMessage" class="status-panel is-error">
        <p>{{ errorMessage }}</p>
        <button class="btn btn-secondary" type="button" @click="loadProjectDetail">
          重新加载
        </button>
      </div>

      <template v-else-if="project">
        <nav class="detail-breadcrumb" aria-label="页面路径">
          <RouterLink to="/">首页</RouterLink>
          <span>/</span>
          <RouterLink v-if="page" :to="`/works/${project.category}`">{{ page.title }}</RouterLink>
          <span v-if="page">/</span>
          <span>{{ project.title }}</span>
        </nav>

        <div class="detail-title-row">
          <div class="detail-title-copy">
            <span class="section-label">{{ page?.label || '作品详情' }}</span>
            <h2>{{ project.title }}</h2>
            <p class="section-desc">{{ projectSummary }}</p>
          </div>
          <RouterLink
            v-if="page"
            class="btn btn-primary detail-list-link"
            :to="`/works/${project.category}`"
          >
            返回作品列表
          </RouterLink>
        </div>

        <div class="detail-meta">
          <span class="project-chip">{{ categoryLabel }}</span>
          <span class="project-chip">{{ typeLabel }}</span>
          <span class="project-chip">作品详情页</span>
        </div>

        <div class="detail-grid">
          <div class="detail-preview">
            <div v-if="project.videoUrl" class="detail-media-container">
              <video 
                :src="project.videoUrl" 
                controls 
                class="detail-video-player"
              >
                您的浏览器不支持视频播放
              </video>
            </div>
            <div v-else-if="project.coverUrl" class="detail-media-container">
              <img :src="project.coverUrl" :alt="project.title" class="detail-cover-image" />
            </div>
            <div v-else class="detail-media-placeholder">
              暂无封面或视频资源
            </div>
          </div>

          <div class="detail-info">
            <div class="detail-card">
              <h3>接口字段</h3>
              <ul class="detail-list">
                <li><strong>id：</strong>{{ project.id }}</li>
                <li><strong>title：</strong>{{ project.title }}</li>
                <li><strong>category：</strong>{{ project.category }}</li>
                <li><strong>type：</strong>{{ project.type }}</li>
                <li><strong>sortOrder：</strong>{{ project.sortOrder }}</li>
                <li><strong>visible：</strong>{{ project.visible }}</li>
                <li><strong>createdAt：</strong>{{ project.createdAt }}</li>
                <li><strong>updatedAt：</strong>{{ project.updatedAt }}</li>
              </ul>
            </div>

            <div class="detail-card">
              <h3>资源字段</h3>
              <ul class="detail-list">
                <li><strong>coverUrl：</strong>{{ project.coverUrl || '未提供' }}</li>
                <li><strong>videoUrl：</strong>{{ project.videoUrl || '未提供' }}</li>
              </ul>
            </div>
          </div>
        </div>
      </template>
    </section>
  </main>
</template>

<style scoped>
.detail-media-container {
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
}

.detail-video-player {
  width: 100%;
  max-height: 600px;
  display: block;
  background: #000;
}

.detail-cover-image {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 16px;
}

.detail-media-placeholder {
  width: 100%;
  padding: 60px 20px;
  text-align: center;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 16px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
}
</style>
