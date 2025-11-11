export default {
    path: '/we',
    name: 'we',
    component: () => import('../views/we/We.vue'),
    children: [
        {
            path: 'we1',
            name: 'we1',
            component: () => import('../views/we/We1.vue'),
        },
        {
            path: 'we2',
            name: 'we2',
            component: () => import('../views/we/We2.vue'),
        },
        {
            path: 'we3',
            name: 'we3',
            component: () => import('../views/we/We3.vue'),
        },
        {
            path: 'we4',
            name: 'we4',
            component: () => import('../views/we/We4.vue'),
        },
        {
            path: 'we5',
            name: 'we5',
            component: () => import('../views/we/We5.vue'),
        },
        {
            path: 'we6',
            name: 'we6',
            component: () => import('../views/we/We6.vue'),
        },
        {
            path: 'we7',
            name: 'we7',
            component: () => import('../views/we/We7.vue'),
        },
        {
            path: 'we8',
            name: 'we8',
            component: () => import('../views/we/We8.vue'),
        },
        {
            path: 'we9',
            name: 'we9',
            component: () => import('../views/we/We9.vue'),
        },
        {
            path: 'we10',
            name: 'we10',
            component: () => import('../views/we/We10.vue'),
        }
    ]
}