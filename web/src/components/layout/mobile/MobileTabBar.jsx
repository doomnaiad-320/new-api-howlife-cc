/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, CircleUserRound, House, ScrollText, Sparkles } from 'lucide-react';

const TAB_ITEMS = [
  {
    key: '/console/home',
    label: '首页',
    icon: House,
  },
  {
    key: '/console/log',
    label: '日志',
    icon: ScrollText,
  },
  {
    key: '/console/models-mobile',
    label: '模型列表',
    icon: Sparkles,
  },
  {
    key: '/console/messages',
    label: '信息',
    icon: Bell,
  },
  {
    key: '/console/personal',
    label: '我的',
    icon: CircleUserRound,
  },
];

const MobileTabBar = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className='mobile-console-tabbar'>
      {TAB_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = location.pathname === item.key;

        return (
          <button
            key={item.key}
            type='button'
            className={`mobile-console-tabbar-item ${active ? 'is-active' : ''}`}
            onClick={() => navigate(item.key)}
          >
            <Icon size={16} />
            <span>{t(item.label)}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default MobileTabBar;
