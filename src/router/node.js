export default {
    path: '/node',
    name: 'node',
    component: () => import('../views/node/Node.vue'),
    children: [
        {
            path: 'node1',
            name: 'node1',
            component: () => import('../views/node/Node1.vue'),
        },
    ]
}