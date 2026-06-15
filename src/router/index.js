import { createRouter, createWebHashHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import ProjectDetailView from '../views/ProjectDetailView.vue';
import WorksView from '../views/WorksView.vue';
import AdminView from '../views/AdminView.vue';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/works/:direction(ue|ai|research)',
      name: 'works',
      component: WorksView,
      props: true
    },
    {
      path: '/projects/:id',
      name: 'project-detail',
      component: ProjectDetailView,
      props: true
    },
    {
      path: '/admin',
      name: 'admin',
      component: AdminView
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }

    if (to.hash) {
      return false;
    }

    return { top: 0 };
  }
});

export default router;
