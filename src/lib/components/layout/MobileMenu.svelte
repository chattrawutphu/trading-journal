<script>
    import { page } from "$app/stores";
    import { menuItems } from '../../data/menuItems.js';

    $: isActive = (path) => $page.url.pathname === path;
</script>

<style>
    .mobile-menu {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 1000;
        background-color: var(--light-card);
        border-top: 1px solid var(--light-border);
        display: flex;
        justify-content: space-around;
        padding: 0.5rem 0;
    }

    .mobile-menu a {
        display: flex;
        flex-direction: column;
        align-items: center;
        color: var(--light-text-muted);
        text-decoration: none;
        font-size: 0.875rem;
        justify-content: center;
        transition: transform 0.2s, color 0.2s;
    }

    .mobile-menu a.active {
        color: var(--theme-500);
        transform: scale(1.2); /* Increase size of active menu item */
        /* Highlight active menu item */
        background: var(--theme-500);
        color: white;
        border-radius: 0.5rem;
        box-shadow: 0 0 10px var(--theme-500);
    }

    .mobile-menu a.active svg {
        fill: currentColor;
    }

    .mobile-menu svg {
        width: 1.5rem;
        height: 1.5rem;
        fill: currentColor; /* Use current text color */
    }

    /* Hide on screens larger than 'sm' */
    @media (min-width: 640px) {
        .mobile-menu {
            display: none;
        }
    }

    /* Support for dark mode */
    @media (prefers-color-scheme: dark) {
        .mobile-menu {
            background-color: var(--dark-card);
            border-top-color: var(--dark-border);
        }

        .mobile-menu a {
            color: var(--dark-text-muted);
        }

        .mobile-menu a.active {
            color: var(--theme-400);
            background: var(--theme-400);
        }
    }
</style>

<div class="mobile-menu">
    {#each menuItems as item}
        {@const active = isActive(item.path)}
        <a href={item.path} class={active ? 'active' : ''}>
            {@html item.icon}
        </a>
    {/each}
</div>
