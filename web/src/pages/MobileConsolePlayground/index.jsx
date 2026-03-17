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

import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Chat, Empty, SideSheet, Toast } from '@douyinfe/semi-ui';
import { IconClose } from '@douyinfe/semi-icons';
import { ChevronDown, Layers3, Search, SlidersHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { UserContext } from '../../context/User';
import { useApiRequest } from '../../hooks/playground/useApiRequest';
import { OptimizedMessageContent } from '../../components/playground/OptimizedComponents';
import {
  API,
  buildApiPayload,
  createLoadingAssistantMessage,
  createMessage,
  encodeToBase64,
  getLogo,
  getTextContent,
  processGroupsData,
  processModelsData,
  showError,
  stringToColor,
} from '../../helpers';
import { API_ENDPOINTS, MESSAGE_ROLES } from '../../constants/playground.constants';

const generateAvatarDataUrl = (username) => {
  const name = String(username || '').trim();
  if (!name) return getLogo();
  const firstLetter = name[0].toUpperCase();
  const bgColor = stringToColor(name);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="16" fill="${bgColor}" />
      <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="16" fill="#ffffff" font-family="sans-serif">${firstLetter}</text>
    </svg>
  `;
  return `data:image/svg+xml;base64,${encodeToBase64(svg)}`;
};

const getGroupDisplayLabel = (groups, value) => {
  const val = String(value || '').trim();
  if (!val) return 'default';
  const found = Array.isArray(groups)
    ? groups.find((g) => String(g.value) === val)
    : null;
  return found?.fullLabel || found?.label || val;
};

const H5PlaygroundInputArea = ({
  detailProps,
  modelLabel,
  groupLabel,
  onOpenPicker,
}) => {
  const { t } = useTranslation();
  const { clearContextNode, inputNode, sendNode, onClick } = detailProps || {};

  const styledClearNode = clearContextNode
    ? React.cloneElement(clearContextNode, {
        className: `h5-playground-clearBtn ${clearContextNode.props.className || ''}`,
        style: {
          ...clearContextNode.props.style,
          width: 36,
          height: 36,
          minWidth: 36,
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
      })
    : null;

  const styledSendNode = sendNode
    ? React.cloneElement(sendNode, {
        className: `h5-playground-sendBtn ${sendNode.props.className || ''}`,
        style: {
          ...sendNode.props.style,
          width: 40,
          height: 40,
          minWidth: 40,
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
      })
    : null;

  return (
    <div className='h5-playground-composer' onClick={onClick}>
      <div className='h5-playground-selectRow'>
        <button
          type='button'
          className='h5-playground-selectBtn'
          onClick={(e) => {
            e.stopPropagation();
            onOpenPicker('model');
          }}
          aria-label={t('选择模型')}
        >
          <SlidersHorizontal size={13} />
          <span className='h5-playground-selectBtn__k'>{t('模型')}</span>
          <span className='h5-playground-selectBtn__v'>
            {modelLabel || t('请选择')}
          </span>
          <ChevronDown size={13} />
        </button>

        <button
          type='button'
          className='h5-playground-selectBtn is-secondary'
          onClick={(e) => {
            e.stopPropagation();
            onOpenPicker('group');
          }}
          aria-label={t('选择分组')}
        >
          <Layers3 size={13} />
          <span className='h5-playground-selectBtn__k'>{t('分组')}</span>
          <span className='h5-playground-selectBtn__v'>{groupLabel || 'default'}</span>
          <ChevronDown size={13} />
        </button>
      </div>

      <div className='h5-playground-composerInner'>
        {styledClearNode}

        <div className='h5-playground-inputWrap'>{inputNode}</div>
        {styledSendNode}
      </div>
    </div>
  );
};

const MobileConsolePlayground = () => {
  const { t } = useTranslation();
  const [userState] = useContext(UserContext);

  // Keep H5 isolated: no localStorage persistence here (do not use usePlaygroundState).
  const [messages, setMessages] = useState([]);
  const [models, setModels] = useState([]);
  const [groups, setGroups] = useState([]);
  const [inputs, setInputs] = useState(() => ({
    model: '',
    group: '',
    stream: true,
  }));

  const sseSourceRef = useRef(null);
  const saveMessagesNoop = useCallback(() => {}, []);
  const [, setDebugData] = useState({});
  const [, setActiveDebugTab] = useState('preview');
  const { sendRequest, onStopGenerator } = useApiRequest(
    setMessages,
    setDebugData,
    setActiveDebugTab,
    sseSourceRef,
    saveMessagesNoop,
  );

  const roleInfo = useMemo(() => {
    const username = userState?.user?.username || 'User';
    return {
      user: {
        name: username,
        avatar: generateAvatarDataUrl(username),
      },
      assistant: {
        name: 'Assistant',
        avatar: getLogo(),
      },
      system: {
        name: 'System',
        avatar: getLogo(),
      },
    };
  }, [userState?.user?.username]);

  const loadModels = useCallback(async () => {
    try {
      const res = await API.get(API_ENDPOINTS.USER_MODELS);
      const { success, message, data } = res.data || {};
      if (!success) {
        showError(t(message || '加载模型失败'));
        return;
      }
      const arr = Array.isArray(data) ? data : [];
      const { modelOptions, selectedModel } = processModelsData(arr, inputs.model);
      setModels(modelOptions);
      if (selectedModel && selectedModel !== inputs.model) {
        setInputs((prev) => ({ ...prev, model: selectedModel }));
      }
    } catch (err) {
      showError(t('加载模型失败'));
    }
  }, [t, inputs.model]);

  const loadGroups = useCallback(async () => {
    try {
      const res = await API.get(API_ENDPOINTS.USER_GROUPS);
      const { success, message, data } = res.data || {};
      if (!success) {
        showError(t(message || '加载分组失败'));
        return;
      }
      const userGroup =
        userState?.user?.group || JSON.parse(localStorage.getItem('user') || '{}')?.group;
      const groupOptions = processGroupsData(data || {}, userGroup);
      setGroups(groupOptions);

      const current = String(inputs.group || '').trim();
      const hasCurrent = groupOptions.some((g) => String(g.value) === current);
      if (!hasCurrent) {
        setInputs((prev) => ({ ...prev, group: groupOptions[0]?.value || '' }));
      }
    } catch (err) {
      showError(t('加载分组失败'));
    }
  }, [t, inputs.group, userState?.user?.group]);

  useEffect(() => {
    loadModels();
    loadGroups();
  }, [loadModels, loadGroups]);

  useEffect(() => {
    return () => {
      onStopGenerator?.();
    };
  }, [onStopGenerator]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState('model'); // 'model' | 'group'
  const [pickerQuery, setPickerQuery] = useState('');

  const openPicker = useCallback((mode) => {
    setPickerMode(mode);
    setPickerQuery('');
    setPickerOpen(true);
  }, []);

  const filteredModels = useMemo(() => {
    const q = String(pickerQuery || '').trim().toLowerCase();
    if (!q) return models;
    return models.filter((m) => String(m?.value || '').toLowerCase().includes(q));
  }, [models, pickerQuery]);

  const filteredGroups = useMemo(() => {
    const q = String(pickerQuery || '').trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => {
      const v = String(g?.value || '').toLowerCase();
      const lbl = String(g?.fullLabel || g?.label || '').toLowerCase();
      return v.includes(q) || lbl.includes(q);
    });
  }, [groups, pickerQuery]);

  const modelLabel = useMemo(() => String(inputs.model || '').trim(), [inputs.model]);
  const groupLabel = useMemo(
    () => getGroupDisplayLabel(groups, inputs.group),
    [groups, inputs.group],
  );

  const toggleReasoningExpansion = useCallback((messageId) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId && msg.role === MESSAGE_ROLES.ASSISTANT
          ? { ...msg, isReasoningExpanded: !msg.isReasoningExpanded }
          : msg,
      ),
    );
  }, []);

  const renderCustomChatContent = useCallback(
    ({ message, className }) => {
      return (
        <OptimizedMessageContent
          message={message}
          className={className}
          styleState={{ isMobile: true }}
          onToggleReasoningExpansion={toggleReasoningExpansion}
          isEditing={false}
          editValue=''
          onEditValueChange={() => {}}
          onEditCancel={() => {}}
          onEditSave={() => {}}
        />
      );
    },
    [toggleReasoningExpansion],
  );

  const handleClearMessages = useCallback(() => {
    onStopGenerator?.();
    setMessages([]);
  }, [onStopGenerator]);

  const handleMessageSend = useCallback(
    (content) => {
      const text = String(content || '').trim();
      if (!text) return;

      const model = String(inputs.model || '').trim();
      if (!model) {
        Toast.warning({ content: t('请先选择模型'), duration: 2 });
        openPicker('model');
        return;
      }

      const userMessage = createMessage(MESSAGE_ROLES.USER, text);
      const loadingMessage = createLoadingAssistantMessage();

      setMessages((prev) => {
        const newMessages = [...prev, userMessage];
        const payload = buildApiPayload(newMessages, null, inputs, {});
        sendRequest(payload, Boolean(inputs.stream));
        return [...newMessages, loadingMessage];
      });
    },
    [inputs, sendRequest, t, openPicker],
  );

  const renderInputArea = useCallback(
    (props) => {
      return (
        <H5PlaygroundInputArea
          {...props}
          modelLabel={modelLabel}
          groupLabel={groupLabel}
          onOpenPicker={openPicker}
        />
      );
    },
    [modelLabel, groupLabel, openPicker],
  );

  return (
    <div className='h5-console-page h5-playground-page mt-[60px] pb-3'>
      <div className='h5-home-app-shell px-2'>
        <div className='h5-playground-chatCard'>
          <Chat
            chats={messages}
            roleConfig={roleInfo}
            onMessageSend={handleMessageSend}
            onMessageCopy={(targetMessage) => {
              const text = getTextContent(targetMessage);
              if (text) {
                navigator.clipboard?.writeText?.(text).then(
                  () => Toast.success({ content: t('已复制'), duration: 1.5 }),
                  () => Toast.error({ content: t('复制失败'), duration: 2 }),
                );
              } else {
                Toast.warning({ content: t('此消息没有可复制内容'), duration: 2 });
              }
            }}
            showClearContext
            onClear={handleClearMessages}
            showStopGenerate
            onStopGenerator={onStopGenerator}
            chatBoxRenderConfig={{
              renderChatBoxTitle: () => null,
              renderChatBoxAction: () => null,
              renderChatBoxContent: renderCustomChatContent,
            }}
            renderInputArea={renderInputArea}
            placeholder={t('输入问题，Enter 发送')}
            className='h5-playground-chat'
          />

          {messages.length === 0 ? (
            <div className='h5-playground-emptyOverlay'>
              <Empty
                image={<div className='h5-playground-emptyIcon'>AI</div>}
                title={t('操练场')}
                description={t('选择模型与分组后开始对话')}
              />
            </div>
          ) : null}
        </div>
      </div>

      <SideSheet
        title={pickerMode === 'model' ? t('选择模型') : t('选择分组')}
        visible={pickerOpen}
        placement='bottom'
        height={560}
        onCancel={() => setPickerOpen(false)}
        closeIcon={<IconClose />}
        className='h5-playground-pickerSheet'
      >
        <div className='h5-playground-pickerInner'>
          <div className='h5-playground-pickerTabs'>
            <button
              type='button'
              className={`h5-playground-pickerTab ${pickerMode === 'model' ? 'is-active' : ''}`}
              onClick={() => setPickerMode('model')}
            >
              <SlidersHorizontal size={14} />
              {t('模型')}
            </button>
            <button
              type='button'
              className={`h5-playground-pickerTab ${pickerMode === 'group' ? 'is-active' : ''}`}
              onClick={() => setPickerMode('group')}
            >
              <Layers3 size={14} />
              {t('分组')}
            </button>
          </div>

          <div className='h5-playground-pickerSearch'>
            <Search size={14} className='h5-playground-pickerSearchIcon' />
            <input
              value={pickerQuery}
              onChange={(e) => setPickerQuery(e.target.value)}
              placeholder={pickerMode === 'model' ? t('搜索模型') : t('搜索分组')}
              className='h5-playground-pickerSearchInput'
            />
          </div>

          <div className='h5-playground-pickerList' role='listbox'>
            {pickerMode === 'model' ? (
              filteredModels.length === 0 ? (
                <Empty image={null} description={t('没有匹配的模型')} />
              ) : (
                filteredModels.map((item) => {
                  const value = String(item?.value || '');
                  const active = value === String(inputs.model || '');
                  return (
                    <button
                      key={value}
                      type='button'
                      className={`h5-playground-pickerItem ${active ? 'is-active' : ''}`}
                      onClick={() => {
                        setInputs((prev) => ({ ...prev, model: value }));
                        setPickerOpen(false);
                      }}
                    >
                      <span className='h5-playground-pickerItemTitle'>{value}</span>
                      {active ? <span className='h5-playground-pickerItemTag'>{t('当前')}</span> : null}
                    </button>
                  );
                })
              )
            ) : filteredGroups.length === 0 ? (
              <Empty image={null} description={t('没有匹配的分组')} />
            ) : (
              filteredGroups.map((item) => {
                const value = String(item?.value || '');
                const active = value === String(inputs.group || '');
                const label = String(item?.fullLabel || item?.label || value);
                return (
                  <button
                    key={value}
                    type='button'
                    className={`h5-playground-pickerItem ${active ? 'is-active' : ''}`}
                    onClick={() => {
                      setInputs((prev) => ({ ...prev, group: value }));
                      setPickerOpen(false);
                    }}
                  >
                    <span className='h5-playground-pickerItemTitle'>{label}</span>
                    <span className='h5-playground-pickerItemSub'>{value}</span>
                    {active ? <span className='h5-playground-pickerItemTag'>{t('当前')}</span> : null}
                  </button>
                );
              })
            )}
          </div>

          <div className='h5-playground-pickerFooter'>
            <Button type='primary' theme='solid' block onClick={() => setPickerOpen(false)}>
              {t('完成')}
            </Button>
          </div>
        </div>
      </SideSheet>
    </div>
  );
};

export default MobileConsolePlayground;
