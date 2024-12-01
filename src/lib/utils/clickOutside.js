/** 
 * Click outside directive for Svelte components
 * Usage: <div use:clickOutside on:clickoutside={handleClickOutside}>
 */
export function clickOutside(node) {
    const handleClick = event => {
        if (node && !node.contains(event.target) && !event.defaultPrevented) {
            node.dispatchEvent(
                new CustomEvent('clickoutside', {
                    detail: { target: event.target }
                })
            );
        }
    };

    document.addEventListener('click', handleClick, true);

    return {
        destroy() {
            document.removeEventListener('click', handleClick, true);
        }
    };
}
