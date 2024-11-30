<!-- src/routes/settings/+page.svelte -->
<script>
    import { onMount } from 'svelte';
    import { auth } from '$lib/stores/authStore';
    import Button from '$lib/components/common/Button.svelte';
    import Input from '$lib/components/common/Input.svelte';
    import Select from '$lib/components/common/Select.svelte';

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
        maxRiskPerTrade: 1, // percentage
        maxDailyLoss: 3, // percentage
        maxPositions: 5,
        defaultStopLoss: 2, // percentage
        defaultTakeProfit: 6, // percentage
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
        <h1 class="text-4xl font-bold gradient-text">Settings</h1>
    </div>

    <!-- Messages -->
    {#if error}
        <div class="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 px-4 py-2 rounded">
            {error}
            <button class="float-right" on:click={clearMessages}>×</button>
        </div>
    {/if}
    {#if success}
        <div class="bg-green-500 bg-opacity-10 border border-green-500 text-green-500 px-4 py-2 rounded">
            {success}
            <button class="float-right" on:click={clearMessages}>×</button>
        </div>
    {/if}

    <!-- Settings Navigation -->
    <div class="border-b border-slate-700">
        <nav class="flex space-x-8">
            {#each ['profile', 'risk', 'rules', 'notifications', 'data'] as tab}
                <button
                    class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === tab ? 'border-blue-500 text-blue-500' : 'border-transparent text-slate-400 hover:text-slate-300'}"
                    on:click={() => activeTab = tab}
                >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
            {/each}
        </nav>
    </div>

    <!-- Settings Content -->
    <div class="bg-slate-800 rounded-lg p-6">
        {#if activeTab === 'profile'}
            <div class="space-y-6">
                <h2 class="text-2xl font-bold text-slate-300">Profile Settings</h2>
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
                            disabled={loading}
                        >
                            Save Profile
                        </Button>
                    </div>
                </div>
            </div>

        {:else if activeTab === 'risk'}
            <div class="space-y-6">
                <h2 class="text-2xl font-bold text-slate-300">Risk Management</h2>
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
                            class="form-checkbox text-blue-500"
                        />
                        <span class="text-slate-300">Enable Risk Warnings</span>
                    </label>
                </div>
                <div class="flex justify-end">
                    <Button
                        variant="primary"
                        on:click={saveRiskSettings}
                        disabled={loading}
                    >
                        Save Risk Settings
                    </Button>
                </div>
            </div>

        {:else if activeTab === 'rules'}
            <div class="space-y-6">
                <h2 class="text-2xl font-bold text-slate-300">Trading Rules</h2>
                <div class="space-y-4">
                    {#each tradingRules as rule}
                        <div class="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                            <span class="text-slate-300">{rule.rule}</span>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    class="sr-only peer"
                                    checked={rule.enabled}
                                    on:change={() => toggleRule(rule.id)}
                                />
                                <div class="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                            </label>
                        </div>
                    {/each}
                    <Button variant="secondary" class="w-full">
                        <i class="fas fa-plus mr-2"></i> Add New Rule
                    </Button>
                </div>
            </div>

        {:else if activeTab === 'notifications'}
            <div class="space-y-6">
                <h2 class="text-2xl font-bold text-slate-300">Notification Settings</h2>
                <div class="space-y-4">
                    {#each Object.entries(notifications) as [key, value]}
                        <label class="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                            <span class="text-slate-300">
                                {key.split(/(?=[A-Z])/).join(' ')}
                            </span>
                            <input
                                type="checkbox"
                                bind:checked={notifications[key]}
                                class="form-checkbox text-blue-500"
                            />
                        </label>
                    {/each}
                </div>
                <div class="flex justify-end">
                    <Button
                        variant="primary"
                        on:click={saveNotifications}
                        disabled={loading}
                    >
                        Save Notification Settings
                    </Button>
                </div>
            </div>

        {:else if activeTab === 'data'}
            <div class="space-y-6">
                <h2 class="text-2xl font-bold text-slate-300">Data Management</h2>
                
                <!-- Export Section -->
                <div class="bg-slate-700 p-6 rounded-lg space-y-4">
                    <h3 class="text-xl font-semibold text-slate-300">Export Data</h3>
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
                        disabled={loading}
                    >
                        <i class="fas fa-download mr-2"></i> Export Data
                    </Button>
                </div>

                <!-- Import Section -->
                <div class="bg-slate-700 p-6 rounded-lg space-y-4">
                    <h3 class="text-xl font-semibold text-slate-300">Import Data</h3>
                    <div class="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center">
                        <input
                            type="file"
                            class="hidden"
                            accept=".csv,.json,.xlsx"
                            id="fileInput"
                        />
                        <label
                            for="fileInput"
                            class="cursor-pointer text-slate-400 hover:text-slate-300"
                        >
                            <i class="fas fa-cloud-upload-alt text-4xl mb-2"></i>
                            <p>Click to upload or drag and drop</p>
                            <p class="text-sm">Supports CSV, JSON, and Excel files</p>
                        </label>
                    </div>
                </div>

                <!-- Danger Zone -->
                <div class="bg-red-500 bg-opacity-10 border border-red-500 rounded-lg p-6 space-y-4">
                    <h3 class="text-xl font-semibold text-red-500">Danger Zone</h3>
                    <p class="text-slate-400">
                        These actions are irreversible. Please be certain.
                    </p>
                    <div class="space-y-2">
                        <Button
                            variant="danger"
                            class="w-full"
                            on:click={() => confirm('Are you sure? This will delete all your trades.')}
                        >
                            Delete All Trades
                        </Button>
                        <Button
                            variant="danger"
                            class="w-full"
                            on:click={() => confirm('Are you sure? This will reset all settings to default.')}
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
    .gradient-text {
        background: linear-gradient(45deg, #3b82f6, #8b5cf6);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }

    :global(.form-checkbox) {
        @apply rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500;
    }
</style>
