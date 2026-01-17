import { Plus, BookOpen, Mail, MessageCircle, Send, Edit, Trash2, Save, Zap, X } from 'lucide-react';
import { formatDate } from './utils';

const TemplatesView = ({ 
    templates = [],
    editingTemplate = null,
    showTemplateModal = false,
    onShowTemplateModal = () => {},
    onCloseTemplateModal = () => {},
    onSetEditingTemplate = () => {},
    onSaveTemplate = () => {},
    onDeleteTemplate = () => {},
    onSetComposeType = () => {},
    onShowComposeModal = () => {}
}) => {
    return (
        <>
            <div className="page-actions">
                <div className="page-actions-left">
                    <h2>Message Templates ({templates.length})</h2>
                </div>
                <div className="page-actions-right">
                    <button className="btn btn-primary" onClick={() => {
                        onSetEditingTemplate(null);
                        onShowTemplateModal(true);
                    }}>
                        <Plus size={18} />
                        New Template
                    </button>
                </div>
            </div>

            <div className="campaign-intro-card">
                <div className="campaign-intro-icon">
                    <BookOpen size={48} />
                </div>
                <div className="campaign-intro-content">
                    <h3>Create Reusable Templates</h3>
                    <p>Save time by creating message templates for your email and WhatsApp campaigns. Use personalization tokens like {"{{name}}"} to customize each message.</p>
                </div>
            </div>

            {templates.length === 0 ? (
                <div className="card table-card">
                    <div className="empty-state">
                        <div className="empty-icon">
                            <BookOpen size={64} />
                        </div>
                        <h3>No templates yet</h3>
                        <p>Create your first template to speed up your campaigns.</p>
                        <button className="btn btn-primary" onClick={() => {
                            onSetEditingTemplate(null);
                            onShowTemplateModal(true);
                        }}>
                            <Plus size={20} />
                            Create Template
                        </button>
                    </div>
                </div>
            ) : (
                <div className="templates-grid">
                    {templates.map(template => (
                        <div key={template.id} className="template-card">
                            <div className="template-header">
                                <span className={`campaign-type-badge ${template.type}`}>
                                    {template.type === 'email' ? <Mail size={14} /> : <MessageCircle size={14} />}
                                    {template.type === 'email' ? 'Email' : 'WhatsApp'}
                                </span>
                                <div className="template-actions">
                                    <button className="action-btn" title="Use Template" onClick={() => {
                                        onSetComposeType(template.type);
                                        onShowComposeModal(true);
                                    }}>
                                        <Send size={16} />
                                    </button>
                                    <button className="action-btn action-btn-edit" title="Edit Template" onClick={() => {
                                        onSetEditingTemplate(template);
                                        onShowTemplateModal(true);
                                    }}>
                                        <Edit size={16} />
                                    </button>
                                    <button className="action-btn action-btn-delete" title="Delete" onClick={() => onDeleteTemplate(template.id)}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <h3 className="template-name">{template.name}</h3>
                            {template.subject && <p className="template-subject">Subject: {template.subject}</p>}
                            <p className="template-preview">{template.content ? template.content.substring(0, 100) + '...' : 'No content'}</p>
                            <div className="template-footer">
                                <span className="template-date">Created {formatDate(template.createdAt)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Template Creation/Edit Modal */}
            {showTemplateModal && (
                <div className="modal-overlay" onClick={() => {
                    onCloseTemplateModal();
                }}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2 className="modal-title">{editingTemplate ? 'Edit Template' : 'Create Template'}</h2>
                                <p className="modal-subtitle">{editingTemplate ? 'Update your message template' : 'Save a reusable message template'}</p>
                            </div>
                            <button className="modal-close" onClick={() => {
                                onCloseTemplateModal();
                            }}>
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.target);
                            onSaveTemplate({
                                name: formData.get('name'),
                                type: formData.get('type'),
                                subject: formData.get('subject'),
                                content: formData.get('content')
                            });
                            onCloseTemplateModal();
                        }}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Template Name</label>
                                    <input 
                                        type="text" 
                                        name="name" 
                                        className="form-input" 
                                        placeholder="e.g., Welcome Email" 
                                        defaultValue={editingTemplate?.name || ''}
                                        required 
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Type</label>
                                    <select name="type" className="form-input" required defaultValue={editingTemplate?.type || ''}>
                                        <option value="">Select type...</option>
                                        <option value="email">Email</option>
                                        <option value="whatsapp">WhatsApp</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Subject (for Email)</label>
                                    <input 
                                        type="text" 
                                        name="subject" 
                                        className="form-input" 
                                        placeholder="Email subject line" 
                                        defaultValue={editingTemplate?.subject || ''}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Message Content</label>
                                    <textarea 
                                        name="content" 
                                        className="form-textarea" 
                                        placeholder="Your message content..." 
                                        rows={6} 
                                        defaultValue={editingTemplate?.content || ''}
                                        required 
                                    />
                                </div>
                                <div className="personalization-hint">
                                    <Zap size={16} />
                                    <span>Use <code>{"{{name}}"}</code>, <code>{"{{certificate}}"}</code>, <code>{"{{rera}}"}</code> for personalization</span>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button 
                                    type="button" 
                                    className="btn btn-secondary" 
                                    onClick={() => {
                                        onCloseTemplateModal();
                                    }}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    <Save size={18} />
                                    {editingTemplate ? 'Update Template' : 'Save Template'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default TemplatesView;
