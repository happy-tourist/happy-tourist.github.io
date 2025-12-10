export default {
    path: '/ul',
    name: 'ul',
    component: () => import('../views/uliss/Ul.vue'),
    children: [
        {
            path: 'ul1',
            name: 'ul1',
            component: () => import('../views/uliss/Ul1.vue'),
        },
        {
            path: 'ul2',
            name: 'ul2',
            component: () => import('../views/uliss/Ul2.vue'),
        },
        {
            path: 'ul3',
            name: 'ul3',
            component: () => import('../views/uliss/Ul3.vue'),
        },
        {
            path: 'ul4',
            name: 'ul4',
            component: () => import('../views/uliss/Ul4.vue'),
        },
        {
            path: 'ul5',
            name: 'ul5',
            component: () => import('../views/uliss/Ul5.vue'),
        },
        {
            path: 'ul6',
            name: 'ul6',
            component: () => import('../views/uliss/Ul6.vue'),
        },
        {
            path: 'ul7',
            name: 'ul7',
            component: () => import('../views/uliss/Ul7.vue'),
        },
        {
            path: 'ul8',
            name: 'ul8',
            component: () => import('../views/uliss/Ul8.vue'),
        },
        {
            path: 'ul9',
            name: 'ul9',
            component: () => import('../views/uliss/Ul9.vue'),
        },
        {
            path: 'ul10',
            name: 'ul10',
            component: () => import('../views/uliss/Ul10.vue'),
        }
    ]
}