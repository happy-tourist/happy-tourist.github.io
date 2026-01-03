export default {
    path: '/history',
    name: 'history',
    component: () => import('../views/history/History.vue'),
    children: [
        {
            path: 'history1',
            name: 'history1',
            component: () => import('../views/history/History1.vue'),
        },
        {
            path: 'history2',
            name: 'history2',
            component: () => import('../views/history/History2.vue'),
        },
    ]
}