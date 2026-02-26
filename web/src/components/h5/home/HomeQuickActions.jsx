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
import { ArrowUpRight } from 'lucide-react';

const HomeQuickActions = ({ t, actions = [] }) => {
  return (
    <section className='h5-home-app-section'>
      <div className='h5-home-app-section-head'>
        <h3 className='h5-home-app-section-title'>{t('快捷入口')}</h3>
        <span className='h5-home-app-section-sub'>{t('高频操作')}</span>
      </div>
      <div className='h5-home-app-quick-grid'>
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.key}
            type='button'
            className='h5-home-app-quick-item'
            onClick={action.onClick}
            aria-label={t(action.title)}
          >
            <div className='h5-home-app-quick-main'>
              <span
                className={`h5-home-app-quick-icon ${action.colorClass || ''}`}
                aria-hidden='true'
              >
                <Icon size={17} />
              </span>
              <span className='h5-home-app-quick-arrow' aria-hidden='true'>
                <ArrowUpRight size={13} />
              </span>
            </div>
            <div className='h5-home-app-quick-content'>
              <span className='h5-home-app-quick-title'>{t(action.title)}</span>
              <span className='h5-home-app-quick-sub'>{t(action.subtitle)}</span>
            </div>
          </button>
        );
      })}
      </div>
    </section>
  );
};

export default HomeQuickActions;
