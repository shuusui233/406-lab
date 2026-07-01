<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { getProjects } from '../api/projects';
import { worksPages } from '../data/site';

const props = defineProps({
  direction: {
    type: String,
    required: true
  }
});

const router = useRouter();

const page = computed(() => worksPages[props.direction] || null);
const projects = ref([]);
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

function getCategoryLabel(category) {
  return categoryLabels[category] || category || '未分类';
}

function getTypeLabel(type) {
  return typeLabels[type] || type || '项目作品';
}

function applyBodyClass() {
  if (!page.value) {
    return;
  }

  clearBodyClass();
  document.body.classList.add('page-works', page.value.accentClass);
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

async function loadProjects() {
  if (!page.value) {
    return;
  }

  loading.value = true;
  errorMessage.value = '';

  try {
    projects.value = await getProjects(props.direction);
  } catch (error) {
    projects.value = [];
    errorMessage.value = error.message || '作品列表加载失败，请稍后重试。';
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.direction,
  async () => {
    if (!page.value) {
      router.replace('/');
      return;
    }

    applyBodyClass();
    await loadProjects();
  }
);

onMounted(async () => {
  if (!page.value) {
    router.replace('/');
    return;
  }

  applyBodyClass();
  await loadProjects();
});

onBeforeUnmount(() => {
  clearBodyClass();
});
</script>

<template>
  <main v-if="page" class="page-shell">
    <header class="page-header">
      <div class="brand-block">
        <h1 style="font-family: 'AlibabaPuHuiTi-2-95-ExtraBold'">欢迎来到406实训室</h1>
        <p>{{ page.pageTitle }}</p>
      </div>
      <div class="header-actions">
        <RouterLink
          class="btn btn-primary"
          :to="{ path: '/', query: { section: page.backHash.replace(/^#/, '') } }"
        >
          返回首页
        </RouterLink>
      </div>
    </header>

    <section class="works-section">
      <nav class="detail-breadcrumb works-breadcrumb" aria-label="页面路径">
        <RouterLink to="/">首页</RouterLink>
        <span>/</span>
        <span>{{ page.title }}</span>
      </nav>

      <div class="works-hero">
        <div class="works-hero-copy">
          <span class="section-label">{{ page.label }}</span>
          <h2>{{ page.title }}</h2>
          <p class="section-desc">{{ page.description }}</p>
        </div>
        <div class="works-hero-panel">
          <span>作品数量</span>
          <strong>{{ projects.length }}</strong>
          <small>按方向分类整理，持续更新中</small>
        </div>
      </div>

      <div class="preview-section">
        <div class="preview-header">
          <h3>作品预览</h3>
          <p>从作品卡片进入详情页，可继续查看项目定位、亮点与适用场景。</p>
        </div>

        <div v-if="loading" class="status-panel">
          正在加载作品列表...
        </div>

        <div v-else-if="errorMessage" class="status-panel is-error">
          <p>{{ errorMessage }}</p>
          <button class="btn btn-secondary" type="button" @click="loadProjects">
            重新加载
          </button>
        </div>

        <div v-else-if="projects.length === 0" class="status-panel">
          当前分类暂无可展示作品。
        </div>

        <div v-else class="preview-grid">
          <RouterLink
            v-for="project in projects"
            :key="project.id"
            class="preview-card project-preview-card"
            :to="{
              path: `/projects/${project.id}`,
              query: { category: project.category }
            }"
          >
            <div v-if="project.coverUrl" class="preview-image-wrapper">
              <img :src="project.coverUrl" :alt="project.title" class="preview-image" />
              <span class="preview-placeholder-badge">{{ page.title }}</span>
            </div>
            <div v-else class="preview-placeholder">
              <span class="preview-placeholder-badge">{{ page.title }}</span>
              <span class="preview-placeholder-title">{{ project.title }}</span>
            </div>
            <div class="preview-card-body">
              <div class="project-meta">
                <span class="project-chip">{{ getCategoryLabel(project.category) }}</span>
                <span class="project-chip">{{ getTypeLabel(project.type) }}</span>
              </div>
              <h4>{{ project.title }}</h4>
              <p>{{ project.description }}</p>
              <div class="project-card-footer project-preview-footer">
                <span>查看项目详情</span>
                <span>{{ getTypeLabel(project.type) }}</span>
              </div>
            </div>
          </RouterLink>
        </div>
      </div>
    </section>
  </main>
</template>
