export default {
    path: '/ai',
    name: 'ai',
    component: () => import('../views/ai/Ai.vue'),
    children: [
        {
            path: 'ai1',
            name: 'ai1',
            component: () => import('../views/ai/Ai1.vue'),
        },
        {
            path: 'ai2',
            name: 'ai2',
            component: () => import('../views/ai/Ai2.vue'),
        },
        {
            path: 'ai3',
            name: 'ai3',
            component: () => import('../views/ai/Ai3.vue'),
        },
        {
            path: 'ai4',
            name: 'ai4',
            component: () => import('../views/ai/Ai4.vue'),
        }
    ]
}