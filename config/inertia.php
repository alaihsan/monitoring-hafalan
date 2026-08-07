<?php

return [
    'testing' => [
        /*
         * Inertia's default page path is resources/js/Pages, but this project stores
         * pages in lowercase resources/js/pages. On a case-sensitive filesystem the
         * default made every ->component() assertion in the test suite fail with
         * "page component file does not exist", regardless of the response.
         */
        'ensure_pages_exist' => true,

        'page_paths' => [
            resource_path('js/pages'),
        ],

        'page_extensions' => [
            'js',
            'jsx',
            'svelte',
            'ts',
            'tsx',
            'vue',
        ],
    ],
];
