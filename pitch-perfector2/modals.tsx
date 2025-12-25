// Error Modal Component
interface ErrorModalProps {
    message: string;
    onClose: () => void;
}

const ErrorModal: React.FC<ErrorModalProps> = ({ message, onClose }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-start mb-4">
                    <div className="bg-red-100 p-3 rounded-full text-red-600">
                        <X size={24} />
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-2">Error</h3>
                <p className="text-slate-600 mb-6 leading-relaxed">
                    {message}
                </p>

                <button
                    onClick={onClose}
                    className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-colors"
                >
                    OK
                </button>
            </div>
        </div>
    );
};

// Loading Modal Component  
interface LoadingModalProps {
    message: string;
}

const LoadingModal: React.FC<LoadingModalProps> = ({ message }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center">
                    <div className="w-16 h-16 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-slate-700 font-semibold text-center">{message}</p>
                </div>
            </div>
        </div>
    );
};

// Browser Unsupported Modal Component
interface BrowserUnsupportedModalProps {
    onClose: () => void;
}

const BrowserUnsupportedModal: React.FC<BrowserUnsupportedModalProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-start mb-4">
                    <div className="bg-amber-100 p-3 rounded-full text-amber-600">
                        <X size={24} />
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-2">Browser Not Supported</h3>
                <p className="text-slate-600 mb-4 leading-relaxed">
                    Your browser doesn't support the audio features required for pitch detection.
                </p>
                <p className="text-slate-600 mb-6 leading-relaxed">
                    Please use a modern browser like <strong>Chrome 66+</strong>, <strong>Firefox 76+</strong>, or <strong>Edge 79+</strong>.
                </p>

                <button
                    onClick={onClose}
                    className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-colors"
                >
                    OK
                </button>
            </div>
        </div>
    );
};
