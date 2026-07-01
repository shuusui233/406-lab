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
  
  return project.value.description || project.value.introduction || detailContent.value?.summary || '项目简介待补充。';
});

const projectMetaItems = computed(() => {
  if (!project.value) {
    return [];
  }

  return [
    { label: '所属方向', value: categoryLabel.value || '未分类' },
    { label: '项目类型', value: typeLabel.value || '项目作品' },
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
    
    // region debug-point video-debugging
    console.log('[VIDEO-DEBUG] 项目详情加载完成:', {
      id: project.value.id,
      title: project.value.title,
      videoUrl: project.value.videoUrl,
      videoUrls: project.value.videoUrls,
      videoUrlsCount: project.value.videoUrls?.length || 0
    });
    // endregion debug-point video-debugging
    
    applyBodyClass();
  } catch (error) {
    errorMessage.value = error.message || '作品详情加载失败，请稍后重试。';
    clearBodyClass();
  } finally {
    loading.value = false;
  }
}

// 视频调试事件处理函数
function handleVideoError(event) {
  const video = event.target;
  console.error('[VIDEO-DEBUG] 视频加载错误:', {
    src: video.src,
    error: video.error,
    errorCode: video.error?.code,
    errorMessage: video.error?.message,
    networkState: video.networkState,
    readyState: video.readyState
  });
}

function handleVideoLoadStart(event) {
  const video = event.target;
  console.log('[VIDEO-DEBUG] 视频开始加载:', {
    src: video.src,
    readyState: video.readyState,
    networkState: video.networkState
  });
}

function handleVideoLoadedData(event) {
  const video = event.target;
  console.log('[VIDEO-DEBUG] 视频数据加载完成:', {
    src: video.src,
    readyState: video.readyState,
    networkState: video.networkState,
    duration: video.duration,
    videoWidth: video.videoWidth,
    videoHeight: video.videoHeight
  });
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
            <div v-if="project.videoUrls && project.videoUrls.length > 0" class="detail-media-container">
              <video 
                :src="project.videoUrls[0]" 
                controls 
                preload="metadata"
                crossOrigin="anonymous"
                class="detail-video-player"
                @error="handleVideoError"
                @loadstart="handleVideoLoadStart"
                @loadeddata="handleVideoLoadedData"
              >
                您的浏览器不支持视频播放
              </video>
            </div>
            <div v-else-if="project.videoUrl" class="detail-media-container">
              <video 
                :src="project.videoUrl" 
                controls 
                preload="metadata"
                crossOrigin="anonymous"
                class="detail-video-player"
                @error="handleVideoError"
                @loadstart="handleVideoLoadStart"
                @loadeddata="handleVideoLoadedData"
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
        </div>

        <div v-if="project.imageUrls && project.imageUrls.length > 0" class="detail-images-section">
          <h3>作品图片</h3>
          <div class="images-grid">
            <div v-for="(url, index) in project.imageUrls" :key="index" class="image-item">
              <img :src="url" :alt="`作品图片 ${index + 1}`" class="detail-gallery-image" />
            </div>
          </div>
        </div>

        <div v-if="project.videoUrls && project.videoUrls.length > 1" class="detail-videos-section">
          <h3>更多视频</h3>
          <div class="videos-grid">
            <div v-for="(url, index) in project.videoUrls.slice(1)" :key="index" class="video-item">
              <video 
                :src="url" 
                controls 
                class="detail-video-player small"
              >
                您的浏览器不支持视频播放
              </video>
            </div>
          </div>
        </div>

        <!-- 作品介绍 -->
        <div class="detail-intro-section">
          <div class="detail-intro-card">
            <h3 class="intro-title">作品介绍</h3>
            <p class="intro-summary">{{ projectSummary }}</p>
          </div>

          <div class="detail-meta-card">
            <h3 class="intro-title">项目信息</h3>
            <div class="meta-list">
              <div v-for="item in projectMetaItems" :key="item.label" class="meta-item">
                <span class="meta-label">{{ item.label }}</span>
                <span class="meta-value">{{ item.value }}</span>
              </div>
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
  border-radius: 22px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.detail-video-player {
  width: 100%;
  min-height: 500px;
  max-height: 80vh;
  display: block;
  background: #000;
}

.detail-cover-image {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 22px;
}

.detail-media-placeholder {
  width: 100%;
  padding: 60px 20px;
  text-align: center;
  background:
    linear-gradient(135deg, rgba(var(--direction-accent-rgb), 0.18), rgba(255, 255, 255, 0.05)),
    rgba(255, 255, 255, 0.03);
  border-radius: 22px;
  color: rgba(255, 255, 255, 0.76);
  font-size: var(--font-size-sm);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.detail-intro-section {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.6rem;
  margin-top: 2rem;
}

.detail-intro-card,
.detail-meta-card {
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 1.75rem;
}

.intro-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: #ffffff;
  margin: 0 0 1rem 0;
  padding-bottom: 0.875rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  letter-spacing: var(--letter-spacing-wide);
}

.intro-summary {
  font-size: var(--font-size-base);
  line-height: var(--line-height-relaxed);
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 1.75rem;
  text-align: justify;
}

.intro-highlights h4,
.intro-scene h4,
.intro-next h4 {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: #ffffff;
  margin: 1.5rem 0 0.75rem 0;
  letter-spacing: var(--letter-spacing-wide);
}

.intro-highlights ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.intro-highlights li {
  position: relative;
  padding-left: 1.5rem;
  margin-bottom: 0.625rem;
  font-size: var(--font-size-sm);
  color: rgba(255, 255, 255, 0.78);
  line-height: var(--line-height-relaxed);
}

.intro-highlights li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.55rem;
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 50%;
  background: rgba(var(--direction-accent-rgb), 1);
}

.intro-scene p,
.intro-next p {
  font-size: var(--font-size-sm);
  line-height: var(--line-height-relaxed);
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  text-align: justify;
}

.meta-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.meta-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.meta-item:last-child {
  border-bottom: none;
}

.meta-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: var(--letter-spacing-wide);
}

.meta-value {
  font-size: var(--font-size-base);
  color: #ffffff;
  font-weight: var(--font-weight-medium);
  letter-spacing: var(--letter-spacing-wide);
}

.detail-images-section,
.detail-videos-section {
  margin-top: 2rem;
}

.detail-images-section h3,
.detail-videos-section h3 {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: #ffffff;
  margin-bottom: 1.25rem;
  letter-spacing: var(--letter-spacing-wide);
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.image-item {
  border-radius: 8px;
  overflow: hidden;
}

.detail-gallery-image {
  width: 100%;
  height: auto;
  aspect-ratio: 4/3;
  object-fit: cover;
}

.videos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.video-item {
  border-radius: 8px;
  overflow: hidden;
}

.detail-video-player.small {
  min-height: 200px;
}

@media (max-width: 768px) {
  .detail-intro-section {
    grid-template-columns: 1fr;
  }
  
  .detail-video-player {
    min-height: 300px;
  }
}
</style>
