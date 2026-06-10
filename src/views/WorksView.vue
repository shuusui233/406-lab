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
        <h1>406实训室</h1>
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
      <span class="section-label">{{ page.label }}</span>
      <h2>{{ page.title }}</h2>
      <p class="section-desc">{{ page.description }}</p>

      <div class="preview-section">
        <div class="preview-header">
          <h3>作品预览</h3>
          <p>当前分类数据由接口 `/api/projects` 按 `category` 参数返回。</p>
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
            <div class="preview-placeholder">
              {{ project.coverUrl ? '封面资源待接入' : project.title }}
            </div>
            <div class="preview-card-body">
              <div class="project-meta">
                <span class="project-chip">{{ project.category }}</span>
                <span class="project-chip">{{ project.type }}</span>
              </div>
              <h4>{{ project.title }}</h4>
              <p>{{ project.description }}</p>
              <span class="project-detail-link">查看详情</span>
            </div>
          </RouterLink>
        </div>
      </div>
    </section>
  </main>
</template>
