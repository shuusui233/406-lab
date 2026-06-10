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
        <div class="detail-title-row">
          <div class="detail-title-copy">
            <span class="section-label">{{ page?.label || '作品详情' }}</span>
            <h2>{{ project.title }}</h2>
            <p class="section-desc">{{ project.description }}</p>
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
          <span class="project-chip">category: {{ project.category }}</span>
          <span class="project-chip">type: {{ project.type }}</span>
          <span class="project-chip">id: {{ project.id }}</span>
        </div>

        <div class="detail-grid">
          <div class="detail-preview">
            <div v-if="project.videoUrl" class="detail-media-placeholder">
              视频资源待接入：{{ project.videoUrl }}
            </div>
            <div v-else-if="project.coverUrl" class="detail-media-placeholder">
              封面资源待接入：{{ project.coverUrl }}
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
