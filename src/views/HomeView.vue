<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  aboutPoints,
  contactItems,
  directionCards,
  directionSections,
  recruitPoints,
  recruitSteps
} from '../data/site';

const route = useRoute();
const router = useRouter();

const sectionIds = [
  'home-section',
  'about-section',
  'ue-section',
  'ai-section',
  'research-section',
  'recruit-section',
  'contact-section'
];

const fullpageRef = ref(null);
const dropdownRef = ref(null);
const sectionRefs = ref([]);
const currentIndex = ref(0);
const isAnimating = ref(false);
const isReady = ref(false);
const isDropdownOpen = ref(false);
const animatedSections = ref(sectionIds.map(() => false));
const sectionScrollState = new WeakMap();

const form = reactive({
  name: '',
  email: '',
  message: ''
});

const submitState = reactive({
  loading: false,
  type: '',
  message: ''
});

const fullpageStyle = computed(() => ({
  transform: `translateY(-${currentIndex.value * 100}vh)`
}));

function setSectionRef(element, index) {
  if (element) {
    sectionRefs.value[index] = element;
  }
}

function getSectionIndexById(id) {
  return sectionIds.findIndex((sectionId) => sectionId === id);
}

function getInitialSectionIndex() {
  const sectionFromQuery =
    typeof route.query.section === 'string' ? route.query.section : null;
  if (sectionFromQuery) {
    const queryIndex = getSectionIndexById(sectionFromQuery);
    if (queryIndex !== -1) {
      return queryIndex;
    }
  }

  const hash = route.hash;
  if (!hash || hash === '#' || hash.startsWith('#/')) {
    return 0;
  }

  const targetIndex = getSectionIndexById(hash.slice(1));
  return targetIndex === -1 ? 0 : targetIndex;
}

function updateBackgroundStage(index) {
  const stage = index === 0 ? '0' : index === 1 ? '1' : '2';
  document.body.setAttribute('data-bg-stage', stage);
}

function setSectionScroll(index, position) {
  const targetSection = sectionRefs.value[index];
  if (!targetSection) {
    return;
  }

  targetSection.scrollTop =
    position === 'bottom' ? targetSection.scrollHeight : 0;
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

function smoothScrollInsideSection(section, deltaY) {
  const maxScrollTop = Math.max(0, section.scrollHeight - section.clientHeight);
  const currentState = sectionScrollState.get(section) || {};
  const from =
    typeof currentState.target === 'number' ? currentState.target : section.scrollTop;
  const target = Math.max(0, Math.min(maxScrollTop, from + deltaY));

  if (Math.abs(target - section.scrollTop) < 1 && !currentState.rafId) {
    section.scrollTop = target;
    sectionScrollState.set(section, { target });
    return;
  }

  if (currentState.rafId) {
    cancelAnimationFrame(currentState.rafId);
  }

  const start = section.scrollTop;
  const change = target - start;
  const duration = 320;
  const startTime = performance.now();

  function animate(now) {
    const progress = Math.min(1, (now - startTime) / duration);
    section.scrollTop = start + change * easeOutCubic(progress);

    if (progress < 1) {
      const rafId = requestAnimationFrame(animate);
      sectionScrollState.set(section, { target, rafId });
    } else {
      section.scrollTop = target;
      sectionScrollState.set(section, { target, rafId: null });
    }
  }

  const rafId = requestAnimationFrame(animate);
  sectionScrollState.set(section, { target, rafId });
}

function animateSectionContent(index) {
  animatedSections.value[index] = true;
}

function syncRouteSection(targetId) {
  if (route.path === '/' && route.query.section === targetId) {
    return;
  }

  router.replace({
    path: '/',
    query: {
      section: targetId
    }
  });
}

function goToSection(index, options = {}) {
  const { enterFrom = 'top', force = false, skipAnimation = false } = options;

  if (index < 0 || index >= sectionIds.length) {
    return;
  }

  if (isAnimating.value && !force) {
    return;
  }

  isAnimating.value = true;
  currentIndex.value = index;
  setSectionScroll(index, enterFrom === 'bottom' ? 'bottom' : 'top');
  updateBackgroundStage(index);
  syncRouteSection(sectionIds[index]);

  if (skipAnimation) {
    isAnimating.value = false;
    animateSectionContent(index);
    return;
  }

  window.setTimeout(() => {
    isAnimating.value = false;
    animateSectionContent(index);
  }, 650);
}

function handleDirectionalScroll(deltaY) {
  const currentSection = sectionRefs.value[currentIndex.value];
  if (!currentSection || isAnimating.value) {
    return;
  }

  const maxScrollTop = Math.max(
    0,
    currentSection.scrollHeight - currentSection.clientHeight
  );
  const nearTop = currentSection.scrollTop <= 2;
  const nearBottom = currentSection.scrollTop >= maxScrollTop - 2;

  if (deltaY > 0) {
    if (!nearBottom) {
      smoothScrollInsideSection(currentSection, deltaY);
    } else {
      goToSection(currentIndex.value + 1, { enterFrom: 'top' });
    }
  } else if (deltaY < 0) {
    if (!nearTop) {
      smoothScrollInsideSection(currentSection, deltaY);
    } else {
      goToSection(currentIndex.value - 1, { enterFrom: 'bottom' });
    }
  }
}

function isTopNavActive(targetId) {
  if (currentIndex.value === 0) {
    return targetId === 'home-section';
  }

  if (currentIndex.value === 1) {
    return targetId === 'about-section';
  }

  if (currentIndex.value >= 5) {
    return currentIndex.value === 5
      ? targetId === 'recruit-section'
      : targetId === 'contact-section';
  }

  return false;
}

function jumpToSection(targetId) {
  const targetIndex = getSectionIndexById(targetId);
  if (targetIndex === -1) {
    return;
  }

  isDropdownOpen.value = false;
  goToSection(targetIndex, { enterFrom: 'top', force: true });
}

function handleWheel(event) {
  event.preventDefault();
  const direction = Math.sign(event.deltaY);
  const magnitude = Math.min(180, Math.max(60, Math.abs(event.deltaY) * 0.9));
  handleDirectionalScroll(direction * magnitude);
}

function handleKeydown(event) {
  if (event.key === 'ArrowDown' || event.key === 'PageDown') {
    event.preventDefault();
    handleDirectionalScroll(140);
  }

  if (event.key === 'ArrowUp' || event.key === 'PageUp') {
    event.preventDefault();
    handleDirectionalScroll(-140);
  }
}

function handleDocumentClick(event) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    isDropdownOpen.value = false;
  }
}

async function handleSubmit() {
  submitState.loading = true;
  submitState.type = '';
  submitState.message = '';

  try {
    const response = await fetch('/api/applications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(form)
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || '报名信息提交失败，请稍后重试。');
    }

    submitState.type = 'success';
    submitState.message = result.message;
    form.name = '';
    form.email = '';
    form.message = '';
  } catch (error) {
    submitState.type = 'error';
    submitState.message = error.message || '提交失败，请稍后重试。';
  } finally {
    submitState.loading = false;
  }
}

watch(
  () => route.query.section,
  async () => {
    await nextTick();
    const targetIndex = getInitialSectionIndex();
    if (targetIndex !== currentIndex.value) {
      goToSection(targetIndex, { enterFrom: 'top', force: true, skipAnimation: true });
    }
  }
);

onMounted(async () => {
  document.body.classList.add('page-home');
  updateBackgroundStage(currentIndex.value);

  document.addEventListener('wheel', handleWheel, { passive: false });
  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('click', handleDocumentClick);

  await nextTick();

  const initialSectionIndex = getInitialSectionIndex();
  currentIndex.value = initialSectionIndex;
  updateBackgroundStage(initialSectionIndex);
  goToSection(initialSectionIndex, {
    enterFrom: 'top',
    force: true,
    skipAnimation: true
  });
  isReady.value = true;
});

onBeforeUnmount(() => {
  document.removeEventListener('wheel', handleWheel);
  document.removeEventListener('keydown', handleKeydown);
  document.removeEventListener('click', handleDocumentClick);
  document.body.classList.remove('page-home');
  document.body.removeAttribute('data-bg-stage');
});
</script>

<template>
  <div class="background-stack" aria-hidden="true">
    <div class="bg-layer bg-fast" />
    <div class="bg-layer bg-slow" />
    <div class="bg-layer bg-static" />
    <div class="bg-overlay" />
  </div>

  <div class="nav">
    <button class="nav-brand" type="button" @click="jumpToSection('home-section')">
      <span class="lab-name">406实训室</span>
    </button>

    <div class="nav-links">
      <button
        class="nav-link"
        :class="{ active: isTopNavActive('home-section') }"
        type="button"
        @click="jumpToSection('home-section')"
      >
        首页
      </button>
      <button
        class="nav-link"
        :class="{ active: isTopNavActive('about-section') }"
        type="button"
        @click="jumpToSection('about-section')"
      >
        关于我们
      </button>

      <div ref="dropdownRef" class="nav-dropdown" :class="{ 'is-open': isDropdownOpen }">
        <button
          class="nav-dropdown-toggle"
          :class="{ active: currentIndex >= 2 && currentIndex <= 4 }"
          type="button"
          @click="isDropdownOpen = !isDropdownOpen"
        >
          技术方向
        </button>
        <div class="nav-dropdown-menu">
          <button
            v-for="direction in directionSections"
            :key="direction.id"
            class="nav-link"
            type="button"
            @click="jumpToSection(direction.id)"
          >
            {{ direction.title }}
          </button>
        </div>
      </div>

      <button
        class="nav-link"
        :class="{ active: isTopNavActive('recruit-section') }"
        type="button"
        @click="jumpToSection('recruit-section')"
      >
        招新信息
      </button>
      <button
        class="nav-link"
        :class="{ active: isTopNavActive('contact-section') }"
        type="button"
        @click="jumpToSection('contact-section')"
      >
        招新报名
      </button>
    </div>
  </div>

  <div
    id="fullpage"
    ref="fullpageRef"
    class="fullpage"
    :class="{ 'is-ready': isReady }"
    :style="fullpageStyle"
  >
    <section
      id="home-section"
      :ref="(element) => setSectionRef(element, 0)"
      class="section hero"
    >
      <div class="content-wrapper fade-in" :class="{ visible: animatedSections[0] }">
        <h1>欢迎来到406实训室</h1>
        <p>创新与实践相遇，梦想在此起航</p>
        <button class="btn btn-primary" type="button" @click="jumpToSection('recruit-section')">
          招新报名
        </button>
      </div>
    </section>

    <section
      id="about-section"
      :ref="(element) => setSectionRef(element, 1)"
      class="section about"
    >
      <div class="content-wrapper fade-in" :class="{ visible: animatedSections[1] }">
        <h2 class="section-title">关于我们</h2>
        <div class="about-content">
          <div class="about-text">
            <span class="about-kicker">ABOUT 406 LAB</span>
            <h2>让技术、创意与实践在同一个空间里发生</h2>
            <p class="about-lead">
              406实训室是一个融合
              <strong>硬核开发</strong>
              、
              <strong>创意表达</strong>
              与
              <strong>项目实战</strong>
              的综合实验室，围绕UE互动开发、AI影视创作与人工智能研究三大方向开展学习、训练与作品落地。
            </p>
            <div class="about-points">
              <div v-for="point in aboutPoints" :key="point.title" class="about-point">
                <strong>{{ point.title }}</strong>
                <span>{{ point.description }}</span>
              </div>
            </div>
            <p class="about-note">
              如果你已经对某个方向感兴趣，可以直接点击下方卡片跳转查看具体内容。
            </p>
          </div>

          <div class="about-features">
            <button
              v-for="card in directionCards"
              :key="card.id"
              class="feature-card direction-card"
              type="button"
              @click="jumpToSection(card.id)"
            >
              <span class="feature-tag">{{ card.tag }}</span>
              <span class="feature-icon" aria-hidden="true">{{ card.icon }}</span>
              <h3>{{ card.title }}</h3>
              <p>{{ card.summary }}</p>
            </button>
          </div>
        </div>
      </div>
    </section>

    <section
      v-for="(direction, offset) in directionSections"
      :id="direction.id"
      :key="direction.id"
      :ref="(element) => setSectionRef(element, offset + 2)"
      class="section direction-section"
      :class="direction.accentClass"
    >
      <div
        class="content-wrapper fade-in"
        :class="{ visible: animatedSections[offset + 2] }"
      >
        <div class="direction-header">
          <span class="direction-label">{{ direction.label }}</span>
          <h2 class="section-title">{{ direction.title }}</h2>
          <p class="direction-desc">{{ direction.description }}</p>
        </div>

        <div class="content-block">
          <h3 class="block-title">项目作品</h3>
          <div class="projects-grid">
            <article
              v-for="project in direction.projects"
              :key="project.title"
              class="project-card"
              :class="{ 'project-card-video-preview': project.isVideoPlaceholder }"
            >
              <div class="project-image">
                <template v-if="project.isVideoPlaceholder">
                  <div class="project-video-placeholder">视频素材待补充</div>
                </template>
                <template v-else>
                  {{ project.preview }}
                </template>
              </div>
              <div class="project-info">
                <h3>{{ project.title }}</h3>
                <p>{{ project.description }}</p>
              </div>
            </article>
          </div>
          <div class="projects-actions">
            <RouterLink class="btn btn-outline-light" :to="`/works/${direction.key}`">
              更多作品
            </RouterLink>
          </div>
        </div>

        <div class="content-block">
          <h3 class="block-title">教师团队</h3>
          <div class="mentor-grid">
            <article
              v-for="mentor in direction.mentors"
              :key="mentor.name"
              class="mentor-card"
            >
              <h4>{{ mentor.name }}</h4>
              <div v-if="mentor.role" class="mentor-role">
                <strong>{{ mentor.role }}</strong>
              </div>
              <p>{{ mentor.description }}</p>
            </article>
          </div>
        </div>
      </div>
    </section>

    <section
      id="recruit-section"
      :ref="(element) => setSectionRef(element, 5)"
      class="section recruit"
    >
      <div class="content-wrapper fade-in" :class="{ visible: animatedSections[5] }">
        <h2 class="section-title">招新信息</h2>
        <div class="recruit-content">
          <div class="recruit-info">
            <h3>我们期待这样的你</h3>
            <ul>
              <li v-for="point in recruitPoints" :key="point">{{ point }}</li>
            </ul>
          </div>
          <div class="recruit-process">
            <h3>加入流程</h3>
            <div class="process-steps">
              <div v-for="(step, index) in recruitSteps" :key="step" class="step">
                <div class="step-number">{{ index + 1 }}</div>
                <p>{{ step }}</p>
              </div>
            </div>
          </div>
        </div>
        <div class="recruit-cta">
          <button class="btn btn-primary" type="button" @click="jumpToSection('contact-section')">
            立即申请
          </button>
        </div>
      </div>
    </section>

    <section
      id="contact-section"
      :ref="(element) => setSectionRef(element, 6)"
      class="section contact"
    >
      <div class="content-wrapper fade-in" :class="{ visible: animatedSections[6] }">
        <h2 class="section-title">招新报名</h2>
        <div class="contact-content">
          <div class="contact-info">
            <span class="contact-info-label">CONTACT</span>
            <h3 class="contact-info-title">联系我们</h3>
            <p class="contact-info-desc">
              如果你想了解招新流程、技术方向或加入方式，可以通过下面的信息联系406实训室，我们会尽快回复你。
            </p>
            <div v-for="item in contactItems" :key="item.title" class="contact-item">
              <div class="contact-item-icon">{{ item.icon }}</div>
              <div class="contact-item-body">
                <h3>{{ item.title }}</h3>
                <p>{{ item.content }}</p>
              </div>
            </div>
          </div>

          <form class="contact-form" @submit.prevent="handleSubmit">
            <span class="contact-form-label">APPLY</span>
            <h3 class="contact-form-title">填写报名信息</h3>
            <p class="contact-form-desc">
              留下你的基本信息和想法，我们会根据报名情况与你联系，安排后续沟通。
            </p>
            <div class="form-group">
              <label for="name">姓名</label>
              <input
                id="name"
                v-model.trim="form.name"
                type="text"
                name="name"
                placeholder="请输入你的姓名"
                required
              >
            </div>
            <div class="form-group">
              <label for="email">邮箱</label>
              <input
                id="email"
                v-model.trim="form.email"
                type="email"
                name="email"
                placeholder="请输入常用邮箱"
                required
              >
            </div>
            <div class="form-group">
              <label for="message">留言</label>
              <textarea
                id="message"
                v-model.trim="form.message"
                name="message"
                rows="5"
                placeholder="可以简单介绍你的兴趣方向、相关经历或想加入的原因"
                required
              />
            </div>
            <div class="contact-form-actions">
              <button class="btn btn-primary contact-submit" type="submit" :disabled="submitState.loading">
                {{ submitState.loading ? '提交中...' : '提交报名信息' }}
              </button>
            </div>
            <p
              v-if="submitState.message"
              class="form-status"
              :class="submitState.type === 'success' ? 'is-success' : 'is-error'"
            >
              {{ submitState.message }}
            </p>
          </form>
        </div>
      </div>
    </section>
  </div>
</template>
