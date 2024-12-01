<!-- src/routes/settings/+page.svelte -->
<script>
    import { onMount } from 'svelte';
    import { auth } from '$lib/stores/authStore';
    import Button from '$lib/components/common/Button.svelte';
    import Input from '$lib/components/common/Input.svelte';
    import Select from '$lib/components/common/Select.svelte';

    const tabs = [
        { id: 'profile', label: 'Profile', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>' },
        { id: 'risk', label: 'Risk', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>' },
        { id: 'rules', label: 'Rules', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>' },
        { id: 'notifications', label: 'Notifications', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>' },
        { id: 'data', label: 'Data', icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>' }
    ];

    let activeTab = 'profile';
    let loading = false;
    let error = '';
    let success = '';

    // Profile Settings
    let profile = {
        name: $auth.user?.name || '',
        email: $auth.user?.email || '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    // Risk Management Settings
    let riskSettings = {
        maxRiskPerTrade: 1,
        maxDailyLoss: 3,
        maxPositions: 5,
        defaultStopLoss: 2,
        defaultTakeProfit: 6,
        enableRiskWarnings: true
    };

    // Trading Rules
    let tradingRules = [
        { id: 1, rule: 'Wait for confirmation before entering a trade', enabled: true },
        { id: 2, rule: 'Always use a stop loss', enabled: true },
        { id: 3, rule: 'Never risk more than 1% per trade', enabled: true },
        { id: 4, rule: 'No trading during major news events', enabled: true },
        { id: 5, rule: 'Only trade during main session hours', enabled: true }
    ];

    // Notification Settings
    let notifications = {
        emailAlerts: true,
        tradeUpdates: true,
        riskWarnings: true,
        performanceReports: true,
        marketNews: false
    };

    // Export Options
    let exportFormat = 'csv';
    let dateRange = '30';

    const timezones = Intl.supportedValuesOf('timeZone').map(tz => ({
        value: tz,
        label: tz.replace(/_/g, ' ')
    }));

    const exportFormats = [
        { value: 'csv', label: 'CSV' },
        { value: 'json', label: 'JSON' },
        { value: 'pdf', label: 'PDF Report' },
        { value: 'xlsx', label: 'Excel' }
    ];

    const dateRanges = [
        { value: '7', label: 'Last 7 Days' },
        { value: '30', label: 'Last 30 Days' },
        { value: '90', label: 'Last 90 Days' },
        { value: '180', label: 'Last 180 Days' },
        { value: '365', label: 'Last Year' },
        { value: 'all', label: 'All Time' }
    ];

    async function saveProfile() {
        try {
            loading = true;
            error = '';
            // TODO: Implement profile update
            success = 'Profile updated successfully';
        } catch (err) {
            error = err.message;
        } finally {
            loading = false;
        }
    }

    async function saveRiskSettings() {
        try {
            loading = true;
            error = '';
            // TODO: Implement risk settings update
            success = 'Risk settings updated successfully';
        } catch (err) {
            error = err.message;
        } finally {
            loading = false;
        }
    }

    async function toggleRule(id) {
        tradingRules = tradingRules.map(rule =>
            rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
        );
    }

    async function saveNotifications() {
        try {
            loading = true;
            error = '';
            // TODO: Implement notification settings update
            success = 'Notification settings updated successfully';
        } catch (err) {
            error = err.message;
        } finally {
            loading = false;
        }
    }

    async function exportData() {
        try {
            loading = true;
            error = '';
            // TODO: Implement data export
            success = 'Data exported successfully';
        } catch (err) {
            error = err.message;
        } finally {
            loading = false;
        }
    }

    function clearMessages() {
        error = '';
        success = '';
    }
</script>

<div class="space-y-8 p-8">
    <!-- Header -->
    <div class="flex justify-between items-center">
        <h1 class="text-4xl font-bold bg-gradient-purple bg-clip-text text-transparent">Settings</h1>
    </div>

    <!-- Messages -->
    {#if error}
        <div class="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
            <div class="flex">
                <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                </svg>
                <span>{error}</span>
            </div>
            <button class="float-right" on:click={clearMessages}>×</button>
        </div>
    {/if}
    {#if success}
        <div class="bg-green-500 bg-opacity-10 border border-green-500 text-green-500 px-4 py-3 rounded-lg">
            <div class="flex">
                <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
                <span>{success}</span>
            </div>
            <button class="float-right" on:click={clearMessages}>×</button>
        </div>
    {/if}

    <!-- Settings Navigation -->
    <div class="card">
        <nav class="flex space-x-1 p-1">
            {#each tabs as tab}
                <button
                    class="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 {activeTab === tab.id ? 'bg-gradient-purple text-white' : 'text-light-text-muted dark:text-dark-text-muted hover:bg-light-hover dark:hover:bg-dark-hover'}"
                    on:click={() => activeTab = tab.id}
                >
                    {@html tab.icon}
                    <span>{tab.label}</span>
                </button>
            {/each}
        </nav>
    </div>

    <!-- Settings Content -->
    <div class="card p-6">
        {#if activeTab === 'profile'}
            <div class="space-y-6">
                <h2 class="text-xl font-semibold text-light-text dark:text-dark-text">Profile Settings</h2>
                <div class="grid grid-cols-1 gap-6">
                    <Input
                        label="Name"
                        type="text"
                        bind:value={profile.name}
                        placeholder="Your name"
                    />
                    <Input
                        label="Email"
                        type="email"
                        bind:value={profile.email}
                        placeholder="your@email.com"
                    />
                    <Select
                        label="Timezone"
                        options={timezones}
                        bind:value={profile.timezone}
                    />
                    <div class="flex justify-end">
                        <Button
                            variant="primary"
                            on:click={saveProfile}
                            loading={loading}
                        >
                            Save Profile
                        </Button>
                    </div>
                </div>
            </div>

        {:else if activeTab === 'risk'}
            <div class="space-y-6">
                <h2 class="text-xl font-semibold text-light-text dark:text-dark-text">Risk Management</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                        label="Max Risk Per Trade (%)"
                        type="number"
                        step="0.1"
                        bind:value={riskSettings.maxRiskPerTrade}
                    />
                    <Input
                        label="Max Daily Loss (%)"
                        type="number"
                        step="0.1"
                        bind:value={riskSettings.maxDailyLoss}
                    />
                    <Input
                        label="Max Open Positions"
                        type="number"
                        bind:value={riskSettings.maxPositions}
                    />
                    <Input
                        label="Default Stop Loss (%)"
                        type="number"
                        step="0.1"
                        bind:value={riskSettings.defaultStopLoss}
                    />
                    <Input
                        label="Default Take Profit (%)"
                        type="number"
                        step="0.1"
                        bind:value={riskSettings.defaultTakeProfit}
                    />
                    <label class="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            bind:checked={riskSettings.enableRiskWarnings}
                            class="checkbox"
                        />
                        <span class="text-light-text dark:text-dark-text">Enable Risk Warnings</span>
                    </label>
                </div>
                <div class="flex justify-end">
                    <Button
                        variant="primary"
                        on:click={saveRiskSettings}
                        loading={loading}
                    >
                        Save Risk Settings
                    </Button>
                </div>
            </div>

        {:else if activeTab === 'rules'}
            <div class="space-y-6">
                <h2 class="text-xl font-semibold text-light-text dark:text-dark-text">Trading Rules</h2>
                <div class="space-y-4">
                    {#each tradingRules as rule}
                        <div class="flex items-center justify-between p-4 bg-light-hover dark:bg-dark-hover rounded-lg">
                            <span class="text-light-text dark:text-dark-text">{rule.rule}</span>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    class="sr-only peer"
                                    checked={rule.enabled}
                                    on:change={() => toggleRule(rule.id)}
                                />
                                <div class="w-11 h-6 bg-light-border dark:bg-dark-border rounded-full peer peer-focus:ring-2 peer-focus:ring-theme-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-theme-500"></div>
                            </label>
                        </div>
                    {/each}
                    <Button variant="secondary" class="w-full">
                        Add New Rule
                    </Button>
                </div>
            </div>

        {:else if activeTab === 'notifications'}
            <div class="space-y-6">
                <h2 class="text-xl font-semibold text-light-text dark:text-dark-text">Notification Settings</h2>
                <div class="space-y-4">
                    {#each Object.entries(notifications) as [key, value]}
                        <label class="flex items-center justify-between p-4 bg-light-hover dark:bg-dark-hover rounded-lg">
                            <span class="text-light-text dark:text-dark-text">
                                {key.split(/(?=[A-Z])/).join(' ')}
                            </span>
                            <input
                                type="checkbox"
                                bind:checked={notifications[key]}
                                class="checkbox"
                            />
                        </label>
                    {/each}
                </div>
                <div class="flex justify-end">
                    <Button
                        variant="primary"
                        on:click={saveNotifications}
                        loading={loading}
                    >
                        Save Notification Settings
                    </Button>
                </div>
            </div>

        {:else if activeTab === 'data'}
            <div class="space-y-6">
                <h2 class="text-xl font-semibold text-light-text dark:text-dark-text">Data Management</h2>
                
                <!-- Export Section -->
                <div class="card p-6 space-y-4">
                    <h3 class="text-lg font-medium text-light-text dark:text-dark-text">Export Data</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select
                            label="Export Format"
                            options={exportFormats}
                            bind:value={exportFormat}
                        />
                        <Select
                            label="Date Range"
                            options={dateRanges}
                            bind:value={dateRange}
                        />
                    </div>
                    <Button
                        variant="primary"
                        class="w-full"
                        on:click={exportData}
                        loading={loading}
                        icon='<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>'
                    >
                        Export Data
                    </Button>
                </div>

                <!-- Import Section -->
                <div class="card p-6 space-y-4">
                    <h3 class="text-lg font-medium text-light-text dark:text-dark-text">Import Data</h3>
                    <div class="border-2 border-dashed border-light-border dark:border-dark-border rounded-lg p-6 text-center">
                        <input
                            type="file"
                            class="hidden"
                            accept=".csv,.json,.xlsx"
                            id="fileInput"
                        />
                        <label
                            for="fileInput"
                            class="cursor-pointer text-light-text-muted dark:text-dark-text-muted hover:text-light-text dark:hover:text-dark-text"
                        >
                            <svg class="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                            </svg>
                            <p>Click to upload or drag and drop</p>
                            <p class="text-sm mt-1">Supports CSV, JSON, and Excel files</p>
                        </label>
                    </div>
                </div>

                <!-- Danger Zone -->
                <div class="bg-red-500 bg-opacity-10 border border-red-500 rounded-lg p-6 space-y-4">
                    <h3 class="text-lg font-medium text-red-500">Danger Zone</h3>
                    <p class="text-light-text-muted dark:text-dark-text-muted">
                        These actions are irreversible. Please be certain.
                    </p>
                    <div class="space-y-2">
                        <Button
                            variant="danger"
                            class="w-full"
                            on:click={() => confirm('Are you sure? This will delete all your trades.')}
                            icon='<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>'
                        >
                            Delete All Trades
                        </Button>
                        <Button
                            variant="danger"
                            class="w-full"
                            on:click={() => confirm('Are you sure? This will reset all settings to default.')}
                            icon='<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>'
                        >
                            Reset All Settings
                        </Button>
                    </div>
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    .card {
        @apply bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg shadow-lg transition-colors duration-200;
    }

    .checkbox {
        @apply h-5 w-5 rounded border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-theme-500 focus:ring-theme-500 focus:ring-offset-2 focus:ring-offset-light-bg dark:focus:ring-offset-dark-bg transition-colors duration-200;
    }
</style>
