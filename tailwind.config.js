import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.jsx',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'Poppins', 'Roboto', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                primary: {
                    DEFAULT: '#1E3A8A',
                    50: '#EFF6FF',
                    100: '#DBEAFE',
                    600: '#1E3A8A',
                    700: '#1E40AF',
                    800: '#1E3A8A',
                },
                secondary: {
                    DEFAULT: '#334155',
                    600: '#334155',
                    700: '#1E293B',
                    800: '#1E293B',
                },
                success: {
                    DEFAULT: '#10B981',
                    50: '#ECFDF5',
                    100: '#D1FAE5',
                    600: '#10B981',
                    700: '#059669',
                    800: '#065F46',
                },
                warning: {
                    DEFAULT: '#F59E0B',
                    50: '#FFFBEB',
                    100: '#FEF3C7',
                    600: '#F59E0B',
                    700: '#D97706',
                    800: '#92400E',
                },
                danger: {
                    DEFAULT: '#EF4444',
                    50: '#FEF2F2',
                    100: '#FEE2E2',
                    600: '#EF4444',
                    700: '#DC2626',
                    800: '#991B1B',
                },
                background: {
                    DEFAULT: '#F8FAFC',
                    card: '#FFFFFF',
                },
            },
            fontSize: {
                'page-title': ['22px', { lineHeight: '1.2', fontWeight: '700' }],
                'section-title': ['18px', { lineHeight: '1.2', fontWeight: '600' }],
                'card-label': ['14px', { lineHeight: '1.5', fontWeight: '500' }],
                'table-text': ['13px', { lineHeight: '1.4', fontWeight: '400' }],
                'sidebar-text': ['14px', { lineHeight: '1.5', fontWeight: '500' }],
            },
        },
    },

    plugins: [forms],
};
