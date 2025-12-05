export default {
    path: '/hobbit',
    name: 'hobbit',
    component: () => import('../views/hobbit/Hobbit.vue'),
    children: [
        {
            path: 'hobbit1',
            name: 'hobbit1',
            component: () => import('../views/hobbit/Hobbit1.vue'),
        },
    ]
}