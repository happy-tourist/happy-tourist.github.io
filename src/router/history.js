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
        {
            path: 'history3',
            name: 'history3',
            component: () => import('../views/history/History3.vue'),
        },
        {
            path: 'history4',
            name: 'history4',
            component: () => import('../views/history/History4.vue'),
        },
        {
            path: 'history5',
            name: 'history5',
            component: () => import('../views/history/History5.vue'),
        },
    ]
}