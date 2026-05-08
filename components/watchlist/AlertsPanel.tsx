"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Trash2, TrendingUp, Bell } from "lucide-react";
import { currencyForMarket, formatCurrency } from "@/lib/utils";
import { deleteAlert } from "@/lib/actions/alert.actions";

interface AlertsPanelProps {
    alerts: any[];
    onRefresh?: () => void;
}

export default function AlertsPanel({ alerts, onRefresh }: AlertsPanelProps) {
    const t = useTranslations('watchlist');

    const handleDelete = async (id: string) => {
        if (confirm(t('alertConfirmDelete'))) {
            await deleteAlert(id);
            if (onRefresh) onRefresh();
        }
    };

    return (
        <div className="bg-gray-900/30 rounded-lg border border-gray-800 p-4 h-full">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center">
                    <Bell className="w-5 h-5 mr-2 text-yellow-500" />
                    {t('alertsTitle')}
                </h2>
            </div>

            <div className="space-y-3">
                {alerts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                        {t('alertsEmpty')}
                    </div>
                ) : (
                    alerts.map((alert) => {
                        const currency = currencyForMarket(alert.market ?? 'US');
                        return (
                        <div key={alert._id} className="bg-gray-800/40 rounded-lg p-3 border border-gray-800 relative group">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center font-bold text-xs text-white">
                                            {alert.symbol[0]}
                                        </div>
                                        <div>
                                            <div className="font-bold text-white text-sm">{alert.symbol}</div>
                                            <div className="text-xs text-gray-400">{t('alertTarget')}: {formatCurrency(alert.targetPrice, currency)}</div>
                                        </div>
                                    </div>
                                    <div className="mt-2 text-xs text-yellow-500 font-medium">
                                        {t('alertCondition')}: {alert.condition.toLowerCase()} {formatCurrency(alert.targetPrice, currency)}
                                    </div>
                                    <div className="text-[10px] text-gray-500 mt-1">
                                        {t('alertActiveUntil', { date: new Date(new Date(alert.createdAt).getTime() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString() })}
                                    </div>
                                </div>
                                <div className="flex flex-col space-y-2">
                                    <button
                                        onClick={() => handleDelete(alert._id)}
                                        className="text-gray-500 hover:text-red-500 transition-colors p-1"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
