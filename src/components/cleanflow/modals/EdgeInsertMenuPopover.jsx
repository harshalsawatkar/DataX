import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  GitFork,
  UserCheck,
  Search,
  X,
  ArrowRight,
  Database,
  Layers,
  Sliders,
  AlertCircle,
  HelpCircle,
  FileCheck2,
  Workflow
} from 'lucide-react';
import { API_BASE_URL } from '../../../services/apiClient';

export default function EdgeInsertMenuPopover({
  isOpen,
  onClose,
  edge,
  fromNode,
  toNode,
  position,
  onSelectNodeType,
  onOpenBuildWithAi
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [edgeData, setEdgeData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && edge) {
      setSearchTerm('');
      setLoading(true);
      fetch(`${API_BASE_URL}/workflow/edge-suggestions?from_node=${encodeURIComponent(fromNode?.type || '')}&to_node=${encodeURIComponent(toNode?.type || '')}`)
        .then(res => res.json())
        .then(data => {
          setEdgeData({ fits_here: data.fitsHere.map(item => ({ ...item, desc: item.description })), not_available_here: data.notAvailableHere, stream: data.streamInfo });
          setLoading(false);
        })
        .catch(() => {
          // Fallback matching Design 6.4
          setEdgeData({
            edge_info: {
              from: fromNode?.title || edge.from || 'Source',
              to: toNode?.title || edge.to || 'Target',
              stream_name: 'raw stream',
              row_count: '1,420 rows',
            },
            fits_here: [
              {
                type: 'rules',
                title: 'AI rules',
                desc: 'Check records against plain-English policy',
                badge: 'Recommended',
                icon: 'Sparkles',
                compatible: true,
              },
              {
                type: 'router',
                title: 'Router · if / else',
                desc: 'Split stream by condition or confidence threshold',
                badge: null,
                icon: 'GitFork',
                compatible: true,
              },
              {
                type: 'hitl',
                title: 'Review · controller gate',
                desc: 'Hold ambiguous rows for human sign-off',
                badge: null,
                icon: 'UserCheck',
                compatible: true,
              },
            ],
            not_available_here: [
              {
                type: 'source',
                title: 'Source node',
                reason: 'Mid-stream inserts cannot create new source origins',
                compatible: false,
              },
              {
                type: 'target',
                title: 'Terminal sink',
                reason: 'Direct inserts cannot terminate downstream pipeline connections',
                compatible: false,
              },
            ],
          });
          setLoading(false);
        });
    }
  }, [isOpen, edge, fromNode, toNode]);

  if (!isOpen || !edge) return null;

  const fitsList = (edgeData?.fits_here || []).filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.desc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const notAvailableList = (edgeData?.not_available_here || []).filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div 
      className="fixed inset-0 z-50"
      onClick={onClose}
    >
      <div 
        className="absolute w-[380px] max-w-[calc(100vw-24px)] bg-white rounded-[18px] shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[min(530px,85vh)]"
        onClick={(e) => e.stopPropagation()}
        style={{
          left: Math.max(12, Math.min((position?.x ?? 52) - 40, window.innerWidth - 392)),
          top: Math.max(12, Math.min(position?.y ?? 12, window.innerHeight - Math.min(542, window.innerHeight * 0.85 + 12)))
        }}
      >
        {/* Header */}
        <div className="p-3.5 pb-1">
          <div className="flex items-center gap-2 text-xs text-slate-600 mb-3">Insert between
            {[fromNode, toNode].map((node, index) => <React.Fragment key={index}>{index === 1 && <ArrowRight size={12}/>}<span className="rounded-full border border-slate-300 px-2 py-1">{{ source:'Source', rules:'AI rules', conditional:'Router', router:'Split', hitl:'Review', target:'Target', quarantine:'DLQ' }[node?.type] || node?.title}</span></React.Fragment>)}
          </div>
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search nodes"
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          </div>
        </div>

        <p className="px-3.5 py-2 text-xs text-slate-500">{edgeData?.stream || `On this edge: ${edge.label || 'Data stream'}`}</p>
        {/* Node Categories */}
        <div className="p-3 overflow-y-auto space-y-3  min-h-0">
          {/* Fits Here */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1">
              FITS HERE
            </div>
            <div className="space-y-1">
              {fitsList.map((node) => {
                const IconComponent = node.type === 'rules' ? Sparkles : ['router', 'conditional'].includes(node.type) ? GitFork : UserCheck;
                return (
                  <button
                    key={node.type}
                    onClick={() => {
                      if (onSelectNodeType) {
                        onSelectNodeType(node.type);
                        onClose();
                      }
                    }}
                    className="w-full text-left p-2.5 rounded-lg first:bg-[#edf0ff] hover:bg-blue-50 transition-all flex items-start gap-2.5 group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200/60 flex items-center justify-center flex-shrink-0 text-[#2D55F5] group-hover:bg-[#2D55F5] group-hover:text-white transition-colors">
                      <IconComponent className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-slate-900 group-hover:text-[#2D55F5]">
                          {node.title}
                        </span>
                        {node.badge && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-blue-100 text-[#2D55F5]">
                            {node.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500  mt-0.5">
                        {node.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Not Available Here */}
          {notAvailableList.length > 0 && (
            <div className="pt-2.5 space-y-1.5">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1">
                NOT AVAILABLE HERE
              </div>
              <div className="space-y-1">
                {notAvailableList.map((node) => (
                  <div
                    key={node.type}
                    className="p-2 rounded-lg  opacity-60 flex items-start gap-2 cursor-not-allowed select-none"
                    title={node.reason}
                  >
                    <div className="w-6 h-6 rounded bg-slate-200 flex items-center justify-center flex-shrink-0 text-slate-500 text-xs">
                      <AlertCircle className="w-3 h-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium text-slate-600 ">
                        {node.title}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {node.reason}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Link to AI Drawer */}
        <div className="p-2.5 border-t border-slate-100 bg-slate-50/80">
          <button
            onClick={() => {
              onClose();
              if (onOpenBuildWithAi) {
                onOpenBuildWithAi(`Insert logic between ${fromNode?.title || 'upstream'} and ${toNode?.title || 'downstream'}`);
              }
            }}
            className="w-full flex items-center justify-start gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold text-[#2D55F5] hover:bg-blue-50/70 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Describe what you need instead</span>
          </button>
        </div>
      </div>
    </div>
  );
}
