import React, { useEffect, useRef } from 'react';

interface AIExerciseViewProps {
    exercise: any;
    currentTheme: any;
    themeMode: 'light' | 'dark';
    language: 'en' | 'pt-BR';
    vocalRange: any;
    onBack: () => void;
    onEdit: () => void;
}

/**
 * AI Exercise View - Uses Pitch Perfector for AI-generated exercises
 */
const AIExerciseView: React.FC<AIExerciseViewProps> = ({
    exercise,
    currentTheme,
    themeMode,
    language,
    vocalRange,
    onBack,
    onEdit
}) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Send exercise data to Pitch Perfector
    useEffect(() => {
        const sendExerciseData = () => {
            if (iframeRef.current?.contentWindow) {
                console.log('📤 Sending AI Exercise to Pitch Perfector...');
                iframeRef.current.contentWindow.postMessage({
                    type: 'VOXLAB_AI_EXERCISE',
                    exercise: exercise,
                    theme: currentTheme,
                    mode: themeMode,
                    language: language,
                    vocalRange: vocalRange
                }, window.location.origin);
            }
        };

        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;

            if (event.data.type === 'PITCH_PERFECTOR_READY') {
                console.log('✅ Pitch Perfector is ready! Sending data...');
                sendExerciseData();
            } else if (event.data.type === 'PP_BACK_TO_AI') {
                onBack();
            } else if (event.data.type === 'PP_EDIT_EXERCISE') {
                onEdit();
            }
        };

        window.addEventListener('message', handleMessage);

        // Fallback: Try sending every 500ms for 2 seconds just in case we missed the ready signal
        const intervalId = setInterval(sendExerciseData, 500);
        const timeoutId = setTimeout(() => clearInterval(intervalId), 2000);

        return () => {
            window.removeEventListener('message', handleMessage);
            clearInterval(intervalId);
            clearTimeout(timeoutId);
        };
    }, [exercise, currentTheme, themeMode, language, vocalRange, onBack, onEdit]);

    return (
        <div
            className="fixed top-0 left-0 w-screen h-screen z-[9999]"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                margin: 0,
                padding: 0
            }}
        >
            <iframe
                ref={iframeRef}
                src="/pitch-perfector2/index.html?mode=ai"
                className="border-0"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    margin: 0,
                    padding: 0
                }}
                title="AI Exercise Player"
                allow="microphone"
            />
        </div>
    );
};

export default AIExerciseView;
