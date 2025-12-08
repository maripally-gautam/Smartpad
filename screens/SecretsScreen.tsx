import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { SecretNote, SecretsConfig } from '../types';
import Icon from '../components/Icon';
import Modal from '../components/Modal';

// Simple hash function for password (SHA-256 simulation using basic hashing)
// In production, use proper crypto library
async function hashString(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

interface SecretsScreenProps {
    onBack: () => void;
    onSelectNote: (noteId: string) => void;
    onNewNote: () => void;
    onDeleteNote: (noteId: string) => void;
}

// Password Setup Modal
const SetupPasswordModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSetup: (config: SecretsConfig) => void;
}> = ({ isOpen, onClose, onSetup }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [securityQuestion, setSecurityQuestion] = useState('');
    const [securityAnswer, setSecurityAnswer] = useState('');
    const [error, setError] = useState('');
    const [step, setStep] = useState(1);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const securityQuestions = [
        "What is your mother's maiden name?",
        "What was the name of your first pet?",
        "What city were you born in?",
        "What is your favorite movie?",
        "What was your childhood nickname?",
    ];

    const handleNext = () => {
        if (password.length < 4) {
            setError('Password must be at least 4 characters');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        setError('');
        setStep(2);
    };

    const handleSetup = async () => {
        if (!securityQuestion) {
            setError('Please select a security question');
            return;
        }
        if (securityAnswer.trim().length < 2) {
            setError('Please provide a valid answer');
            return;
        }

        const passwordHash = await hashString(password);
        const securityAnswerHash = await hashString(securityAnswer.trim().toLowerCase());

        onSetup({
            passwordHash,
            securityQuestion,
            securityAnswerHash,
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
            <div className="bg-white dark:bg-secondary p-6 rounded-2xl w-full max-w-sm shadow-2xl border border-slate-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-slate-900 dark:text-text-primary mb-4">
                    {step === 1 ? 'Create Password' : 'Security Question'}
                </h2>

                {step === 1 ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-slate-600 dark:text-text-secondary mb-1">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter password"
                                    className="w-full bg-slate-100 dark:bg-border-color p-3 pr-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent"
                                />
                                <button
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 active:text-slate-600 dark:active:text-gray-300 transition-colors"
                                >
                                    <Icon name={showPassword ? "eye-off" : "eye"} className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-600 dark:text-text-secondary mb-1">Confirm Password</label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm password"
                                    className="w-full bg-slate-100 dark:bg-border-color p-3 pr-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent"
                                />
                                <button
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 active:text-slate-600 dark:active:text-gray-300 transition-colors"
                                >
                                    <Icon name={showConfirmPassword ? "eye-off" : "eye"} className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600 dark:text-text-secondary">
                            This will be used to recover your secrets if you forget your password.
                        </p>
                        <div>
                            <label className="block text-sm text-slate-600 dark:text-text-secondary mb-1">Security Question</label>
                            <select
                                value={securityQuestion}
                                onChange={(e) => setSecurityQuestion(e.target.value)}
                                className="w-full bg-slate-100 dark:bg-border-color p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                            >
                                <option value="">Select a question...</option>
                                {securityQuestions.map((q) => (
                                    <option key={q} value={q}>{q}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-600 dark:text-text-secondary mb-1">Answer</label>
                            <input
                                type="text"
                                value={securityAnswer}
                                onChange={(e) => setSecurityAnswer(e.target.value)}
                                placeholder="Your answer"
                                className="w-full bg-slate-100 dark:bg-border-color p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                            />
                        </div>
                    </div>
                )}

                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

                <div className="flex justify-end gap-2 mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-full text-slate-600 dark:text-text-secondary font-semibold"
                    >
                        Cancel
                    </button>
                    {step === 1 ? (
                        <button
                            onClick={handleNext}
                            className="px-4 py-2 rounded-full bg-accent text-white font-semibold"
                        >
                            Next
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={() => setStep(1)}
                                className="px-4 py-2 rounded-full text-slate-600 dark:text-text-secondary font-semibold"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleSetup}
                                className="px-4 py-2 rounded-full bg-accent text-white font-semibold"
                            >
                                Setup
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// Password Entry Modal
const EnterPasswordModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    secretsConfig: SecretsConfig;
    onResetPassword: () => void;
}> = ({ isOpen, onClose, onSuccess, secretsConfig, onResetPassword }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showForgot, setShowForgot] = useState(false);
    const [securityAnswer, setSecurityAnswer] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleVerify = async () => {
        const hash = await hashString(password);
        if (hash === secretsConfig.passwordHash) {
            setPassword('');
            setError('');
            onSuccess();
        } else {
            setError('Incorrect password');
        }
    };

    const handleForgotPassword = async () => {
        const answerHash = await hashString(securityAnswer.trim().toLowerCase());
        if (answerHash === secretsConfig.securityAnswerHash) {
            setSecurityAnswer('');
            setShowForgot(false);
            onResetPassword();
        } else {
            setError('Incorrect answer');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
            <div className="bg-white dark:bg-secondary p-6 rounded-2xl w-full max-w-sm shadow-2xl border border-slate-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-slate-900 dark:text-text-primary mb-4">
                    {showForgot ? 'Forgot Password' : 'Enter Password'}
                </h2>

                {showForgot ? (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600 dark:text-text-secondary">
                            {secretsConfig.securityQuestion}
                        </p>
                        <input
                            type="text"
                            value={securityAnswer}
                            onChange={(e) => setSecurityAnswer(e.target.value)}
                            placeholder="Your answer"
                            className="w-full bg-slate-100 dark:bg-border-color p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                className="w-full bg-slate-100 dark:bg-border-color p-3 pr-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent"
                                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                            />
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 active:text-slate-600 dark:active:text-gray-300 transition-colors"
                            >
                                <Icon name={showPassword ? "eye-off" : "eye"} className="w-5 h-5" />
                            </button>
                        </div>
                        <button
                            onClick={() => { setShowForgot(true); setError(''); }}
                            className="text-sm text-accent"
                        >
                            Forgot password?
                        </button>
                    </div>
                )}

                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

                <div className="flex justify-end gap-2 mt-6">
                    <button
                        onClick={() => { onClose(); setShowForgot(false); setPassword(''); setSecurityAnswer(''); setError(''); }}
                        className="px-4 py-2 rounded-full text-slate-600 dark:text-text-secondary font-semibold"
                    >
                        Cancel
                    </button>
                    {showForgot ? (
                        <>
                            <button
                                onClick={() => { setShowForgot(false); setError(''); }}
                                className="px-4 py-2 rounded-full text-slate-600 dark:text-text-secondary font-semibold"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleForgotPassword}
                                className="px-4 py-2 rounded-full bg-accent text-white font-semibold"
                            >
                                Verify
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={handleVerify}
                            className="px-4 py-2 rounded-full bg-accent text-white font-semibold"
                        >
                            Unlock
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// Change Password Modal - requires current password verification
const ChangePasswordModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    secretsConfig: SecretsConfig;
    onPasswordChanged: (newConfig: SecretsConfig) => void;
}> = ({ isOpen, onClose, secretsConfig, onPasswordChanged }) => {
    const [step, setStep] = useState<'verify' | 'new'>('verify');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleVerifyCurrentPassword = async () => {
        const hash = await hashString(currentPassword);
        if (hash === secretsConfig.passwordHash) {
            setError('');
            setStep('new');
        } else {
            setError('Incorrect current password');
        }
    };

    const handleChangePassword = async () => {
        if (newPassword.length < 4) {
            setError('Password must be at least 4 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        const newPasswordHash = await hashString(newPassword);

        // Keep the same security question and answer
        onPasswordChanged({
            ...secretsConfig,
            passwordHash: newPasswordHash,
        });

        // Reset and close
        handleClose();
    };

    const handleClose = () => {
        setStep('verify');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setError('');
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
            <div className="bg-white dark:bg-secondary p-6 rounded-2xl w-full max-w-sm shadow-2xl border border-slate-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-slate-900 dark:text-text-primary mb-4">
                    {step === 'verify' ? 'Change Password' : 'Set New Password'}
                </h2>

                {step === 'verify' ? (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600 dark:text-text-secondary">
                            Enter your current password to continue.
                        </p>
                        <div className="relative">
                            <input
                                type={showCurrentPassword ? "text" : "password"}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Current password"
                                className="w-full bg-slate-100 dark:bg-border-color p-3 pr-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent"
                                onKeyDown={(e) => e.key === 'Enter' && handleVerifyCurrentPassword()}
                            />
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 active:text-slate-600 dark:active:text-gray-300 transition-colors"
                            >
                                <Icon name={showCurrentPassword ? "eye-off" : "eye"} className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-slate-600 dark:text-text-secondary mb-1">New Password</label>
                            <div className="relative">
                                <input
                                    type={showNewPassword ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    className="w-full bg-slate-100 dark:bg-border-color p-3 pr-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent"
                                />
                                <button
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 active:text-slate-600 dark:active:text-gray-300 transition-colors"
                                >
                                    <Icon name={showNewPassword ? "eye-off" : "eye"} className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-600 dark:text-text-secondary mb-1">Confirm New Password</label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password"
                                    className="w-full bg-slate-100 dark:bg-border-color p-3 pr-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent"
                                />
                                <button
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 active:text-slate-600 dark:active:text-gray-300 transition-colors"
                                >
                                    <Icon name={showConfirmPassword ? "eye-off" : "eye"} className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

                <div className="flex justify-end gap-2 mt-6">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 rounded-full text-slate-600 dark:text-text-secondary font-semibold"
                    >
                        Cancel
                    </button>
                    {step === 'verify' ? (
                        <button
                            onClick={handleVerifyCurrentPassword}
                            className="px-4 py-2 rounded-full bg-accent text-white font-semibold"
                        >
                            Continue
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={() => { setStep('verify'); setError(''); }}
                                className="px-4 py-2 rounded-full text-slate-600 dark:text-text-secondary font-semibold"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleChangePassword}
                                className="px-4 py-2 rounded-full bg-accent text-white font-semibold"
                            >
                                Change
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// Secret Note Card
const SecretNoteCard: React.FC<{
    note: SecretNote;
    onSelect: () => void;
    onDelete: () => void;
}> = ({ note, onSelect, onDelete }) => {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Strip HTML for preview
    const textContent = note.content
        .replace(/&nbsp;/g, ' ')
        .replace(/<[^>]*>?/gm, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const snippet = textContent.substring(0, 100);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <>
            <div
                onClick={onSelect}
                className="bg-slate-100 dark:bg-secondary/80 p-4 rounded-xl cursor-pointer active:bg-slate-200 dark:active:bg-border-color transition-all duration-200 border border-slate-200 dark:border-gray-700/50 shadow-sm"
            >
                <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-slate-800 dark:text-text-primary truncate flex-1">
                        {note.title || 'Untitled'}
                    </h3>
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                        className="p-1.5 text-red-500 active:text-red-600 active:bg-red-50 dark:active:bg-red-900/30 rounded-lg transition-all"
                    >
                        <Icon name="trash" className="w-4 h-4" />
                    </button>
                </div>
                {snippet && (
                    <p className="text-slate-500 dark:text-text-secondary text-sm mt-1 line-clamp-2">
                        {snippet}
                    </p>
                )}
                <p className="text-slate-400 dark:text-text-secondary text-xs mt-2">
                    Created: {formatDate(note.createdAt)}
                </p>
            </div>

            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in p-4">
                    <div className="bg-white dark:bg-secondary p-6 rounded-lg w-full max-w-sm shadow-lg text-center">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-text-primary mb-2">Delete Note?</h2>
                        <p className="text-slate-600 dark:text-text-secondary mb-6">This action cannot be undone.</p>
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-6 py-2 rounded-full bg-slate-200 dark:bg-border-color text-slate-800 dark:text-text-primary font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => { setShowDeleteConfirm(false); onDelete(); }}
                                className="px-6 py-2 rounded-full bg-red-600 text-white font-semibold"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

const SecretsScreen: React.FC<SecretsScreenProps> = ({ onBack, onSelectNote, onNewNote, onDeleteNote }) => {
    const { secretNotes, secretsConfig, setSecretsConfig, secretsUnlocked, setSecretsUnlocked } = useAppContext();
    const [showSetupModal, setShowSetupModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

    // Check if secrets are configured
    const isConfigured = secretsConfig !== null;

    const handleShowSecrets = () => {
        if (!isConfigured) {
            setShowSetupModal(true);
        } else {
            setShowPasswordModal(true);
        }
    };

    const handleSetup = (config: SecretsConfig) => {
        setSecretsConfig(config);
        setShowSetupModal(false);
        setSecretsUnlocked(true);
    };

    const handlePasswordSuccess = () => {
        setShowPasswordModal(false);
        setSecretsUnlocked(true);
    };

    const handleResetPassword = () => {
        // Reset password - show setup modal again
        setShowPasswordModal(false);
        setShowSetupModal(true);
    };

    const handleDeleteSecret = (id: string) => {
        onDeleteNote(id);
    };

    const handleLock = () => {
        setSecretsUnlocked(false);
    };

    const handlePasswordChanged = (newConfig: SecretsConfig) => {
        setSecretsConfig(newConfig);
        setShowChangePasswordModal(false);
    };

    // Lock when navigating away from secrets section (to settings or list)
    const handleBack = () => {
        setSecretsUnlocked(false);
        onBack();
    };

    return (
        <div className="h-full flex flex-col bg-white dark:bg-primary text-slate-800 dark:text-text-primary">
            <header className="p-4 flex items-center gap-3 border-b border-slate-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-900 z-10">
                <button onClick={handleBack} className="p-2 -ml-2 rounded-full active:bg-slate-100 dark:active:bg-gray-800 transition-colors flex items-center gap-2">
                    <Icon name="back" className="w-5 h-5" />
                    <span className="text-xl font-bold bg-gradient-to-r from-accent to-blue-600 bg-clip-text text-transparent">Secrets</span>
                </button>
                <div className="flex-1"></div>
                {secretsUnlocked && (
                    <>
                        <button
                            onClick={() => setShowChangePasswordModal(true)}
                            className="p-2 text-slate-500 dark:text-text-secondary active:bg-slate-100 dark:active:bg-gray-800 rounded-full transition-colors"
                            title="Change Password"
                        >
                            <Icon name="settings" className="w-5 h-5" />
                        </button>
                        <button onClick={handleLock} className="p-2 text-slate-500 dark:text-text-secondary active:bg-slate-100 dark:active:bg-gray-800 rounded-full transition-colors">
                            <Icon name="lock" className="w-5 h-5" />
                        </button>
                    </>
                )}
            </header>

            <div className="flex-1 overflow-y-auto p-4">
                {!secretsUnlocked ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="bg-slate-100 dark:bg-secondary p-6 rounded-full mb-4">
                            <Icon name="lock" className="w-12 h-12 text-accent" />
                        </div>
                        <h2 className="text-xl font-semibold mb-2">Your Secrets are Locked</h2>
                        <p className="text-slate-500 dark:text-text-secondary mb-6 max-w-xs">
                            {isConfigured
                                ? 'Enter your password to view your secret notes.'
                                : 'Create a password to start saving secret notes.'}
                        </p>
                        <button
                            onClick={handleShowSecrets}
                            className="px-6 py-3 rounded-full bg-accent text-white font-semibold"
                        >
                            {isConfigured ? 'Show Secrets' : 'Create Password'}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {secretNotes.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-slate-500 dark:text-text-secondary mb-4">No secret notes yet</p>
                                <button
                                    onClick={onNewNote}
                                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 via-blue-600 to-cyan-500 text-white font-semibold shadow-lg shadow-blue-500/30 transition-all duration-200 active:scale-95"
                                >
                                    Add Secret Note
                                </button>
                            </div>
                        ) : (
                            <>
                                <button
                                    onClick={onNewNote}
                                    className="w-full p-4 rounded-xl bg-gradient-to-r from-blue-500 via-blue-600 to-cyan-500 text-white font-semibold shadow-lg shadow-blue-500/30 transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    <Icon name="plus" className="w-5 h-5" />
                                    Add Secret Note
                                </button>
                                {secretNotes.map((note) => (
                                    <SecretNoteCard
                                        key={note.id}
                                        note={note}
                                        onSelect={() => onSelectNote(note.id)}
                                        onDelete={() => handleDeleteSecret(note.id)}
                                    />
                                ))}
                            </>
                        )}
                    </div>
                )}
            </div>

            <SetupPasswordModal
                isOpen={showSetupModal}
                onClose={() => setShowSetupModal(false)}
                onSetup={handleSetup}
            />

            {secretsConfig && (
                <EnterPasswordModal
                    isOpen={showPasswordModal}
                    onClose={() => setShowPasswordModal(false)}
                    onSuccess={handlePasswordSuccess}
                    secretsConfig={secretsConfig}
                    onResetPassword={handleResetPassword}
                />
            )}

            {secretsConfig && (
                <ChangePasswordModal
                    isOpen={showChangePasswordModal}
                    onClose={() => setShowChangePasswordModal(false)}
                    secretsConfig={secretsConfig}
                    onPasswordChanged={handlePasswordChanged}
                />
            )}
        </div>
    );
};

export default SecretsScreen;
