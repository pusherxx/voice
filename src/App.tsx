import React, { useState, useRef, useEffect } from 'react';

interface KeyPoint {
  text: string;
  category: 'importante' | 'azione' | 'decisione' | 'altro';
}

const App = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [editableTranscript, setEditableTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [keyPoints, setKeyPoints] = useState<KeyPoint[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const recognitionRef = useRef<any>(null);
  const autoSaveIntervalRef = useRef<NodeJS.Timeout>();

  // Auto-save ogni 30 secondi
  useEffect(() => {
    if (transcript) {
      autoSaveIntervalRef.current = setInterval(() => {
        localStorage.setItem('autoSavedTranscript', transcript);
        console.log('Trascrizione salvata automaticamente');
      }, 30000);
    }

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [transcript]);

  // Recupera l'ultimo salvataggio automatico all'avvio
  useEffect(() => {
    const savedTranscript = localStorage.getItem('autoSavedTranscript');
    if (savedTranscript) {
      setTranscript(savedTranscript);
      setEditableTranscript(savedTranscript);
    }
  }, []);

  const startRecording = () => {
    try {
      // @ts-ignore
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = 'it-IT';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript) {
          setTranscript(prev => prev + finalTranscript);
          setEditableTranscript(prev => prev + finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Errore nel riconoscimento vocale:', event.error);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
    } catch (error) {
      console.error('Errore durante l\'avvio del riconoscimento vocale:', error);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const categorizeKeyPoints = (text: string): KeyPoint[] => {
    const sentences = text.split(/[.!?]+/).filter(Boolean);
    
    return sentences
      .filter(sentence => sentence.length > 20)
      .map(sentence => {
        const lowerSentence = sentence.toLowerCase();
        let category: KeyPoint['category'] = 'altro';

        if (lowerSentence.includes('importante') || lowerSentence.includes('fondamentale')) {
          category = 'importante';
        } else if (lowerSentence.includes('dobbiamo') || lowerSentence.includes('bisogna')) {
          category = 'azione';
        } else if (lowerSentence.includes('deciso') || lowerSentence.includes('stabilito')) {
          category = 'decisione';
        }

        return {
          text: sentence.trim(),
          category
        };
      });
  };

  const generateSummary = () => {
    const points = categorizeKeyPoints(editableTranscript);
    setKeyPoints(points);

    const summaryText = `Riassunto Dettagliato:\n\n` +
      `PUNTI IMPORTANTI:\n${points
        .filter(p => p.category === 'importante')
        .map((p, i) => `${i + 1}. ${p.text}`)
        .join('\n')}\n\n` +
      `AZIONI DA INTRAPRENDERE:\n${points
        .filter(p => p.category === 'azione')
        .map((p, i) => `${i + 1}. ${p.text}`)
        .join('\n')}\n\n` +
      `DECISIONI PRESE:\n${points
        .filter(p => p.category === 'decisione')
        .map((p, i) => `${i + 1}. ${p.text}`)
        .join('\n')}\n\n` +
      `ALTRI PUNTI CHIAVE:\n${points
        .filter(p => p.category === 'altro')
        .map((p, i) => `${i + 1}. ${p.text}`)
        .join('\n')}`;

    setSummary(summaryText);
  };

  const saveToFile = async (content: string, fileType: 'transcript' | 'summary') => {
    try {
      // Usa showSaveFilePicker per permettere all'utente di scegliere dove salvare
      const handle = await window.showSaveFilePicker({
        suggestedName: `${fileType}-${new Date().toISOString().slice(0, 19).replace(/[:]/g, '-')}.txt`,
        types: [{
          description: 'File di testo',
          accept: { 'text/plain': ['.txt'] },
        }],
      });
      
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      
      alert(`File ${fileType} salvato con successo!`);
    } catch (err) {
      console.error('Errore durante il salvataggio:', err);
      // Fallback al metodo precedente se showSaveFilePicker non è supportato
      const element = document.createElement('a');
      const file = new Blob([content], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, '-');
      element.download = `${fileType}-${timestamp}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl mb-4">Registratore Vocale Avanzato (Solo Italiano)</h1>
      <div className="space-y-4">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`px-4 py-2 rounded ${
            isRecording ? 'bg-red-500' : 'bg-blue-500'
          } text-white`}
        >
          {isRecording ? 'Stop Registrazione' : 'Inizia Registrazione'}
        </button>
        
        {transcript && (
          <div className="mt-4">
            <h2 className="text-xl mb-2">Trascrizione:</h2>
            {isEditing ? (
              <textarea
                value={editableTranscript}
                onChange={(e) => setEditableTranscript(e.target.value)}
                className="w-full p-4 bg-gray-100 rounded min-h-[200px]"
              />
            ) : (
              <p className="p-4 bg-gray-100 rounded">{editableTranscript}</p>
            )}
            <div className="mt-2 space-x-2">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-4 py-2 bg-yellow-500 text-white rounded"
              >
                {isEditing ? 'Salva Modifiche' : 'Modifica Trascrizione'}
              </button>
              <button
                onClick={() => saveToFile(editableTranscript, 'transcript')}
                className="px-4 py-2 bg-green-500 text-white rounded"
              >
                Salva Trascrizione
              </button>
              <button
                onClick={generateSummary}
                className="px-4 py-2 bg-purple-500 text-white rounded"
              >
                Genera Riassunto
              </button>
            </div>
          </div>
        )}

        {summary && (
          <div className="mt-4">
            <h2 className="text-xl mb-2">Riassunto dei Punti Chiave:</h2>
            <pre className="p-4 bg-gray-100 rounded whitespace-pre-wrap">{summary}</pre>
            <button
              onClick={() => saveToFile(summary, 'summary')}
              className="mt-2 px-4 py-2 bg-green-500 text-white rounded"
            >
              Salva Riassunto
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default App; 