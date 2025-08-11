"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const formatTime_1 = require("../utils/formatTime");
const PlatformStats = ({ platform, stats, apps }) => {
    const platformNames = {
        windows: 'Windows',
        macos: 'macOS',
        android: 'Android',
    };
    return ((0, jsx_runtime_1.jsxs)("section", { className: "platform-stats", children: [(0, jsx_runtime_1.jsx)("h3", { children: platformNames[platform] || platform }), (0, jsx_runtime_1.jsxs)("div", { className: "stats-grid", children: [(0, jsx_runtime_1.jsxs)("div", { className: "stat-card", children: [(0, jsx_runtime_1.jsx)("h4", { children: "\uC0AC\uC6A9\uD55C \uC571 \uC218" }), (0, jsx_runtime_1.jsxs)("div", { className: "stat-value", children: [stats?.total_apps || 0, "\uAC1C"] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "stat-card", children: [(0, jsx_runtime_1.jsx)("h4", { children: "\uCD1D \uC0AC\uC6A9 \uC2DC\uAC04" }), (0, jsx_runtime_1.jsx)("div", { className: "stat-value", children: (0, formatTime_1.formatTime)(stats?.total_usage_seconds || 0) })] })] }), apps && apps.length > 0 && ((0, jsx_runtime_1.jsx)("div", { className: "usage-list", children: apps.slice(0, 5).map((app, index) => ((0, jsx_runtime_1.jsxs)("div", { className: "usage-item", children: [(0, jsx_runtime_1.jsx)("div", { className: "app-name", children: app.app_name }), (0, jsx_runtime_1.jsx)("div", { className: "usage-time", children: (0, formatTime_1.formatTime)(app.total_usage_seconds) })] }, index))) }))] }));
};
exports.default = PlatformStats;
