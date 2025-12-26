export default {
    path: '/china',
    name: 'china',
    component: () => import('../views/china/China.vue'),
    children: [
        {
            path: 'china1',
            name: 'china1',
            component: () => import('../views/china/China1.vue'),
        },
    ]
}