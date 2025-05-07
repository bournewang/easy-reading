/**
 * Splits text into sentences while handling various edge cases:
 * - Contractions (e.g., "don't", "there's")
 * - Quotes and dialogue
 * - Abbreviations
 * - Numbers and decimals
 * - Company names
 */
export function splitIntoSentences(text: string): string[] {
    // First normalize newlines to spaces to prevent incorrect splits
    const normalizedText = text.replace(/\s+/g, ' ');

    // Define states
    enum State {
        Normal,
        Quote,
        Protected,
        EndOfSentence
    }

    // Initialize variables
    const sentences: string[] = [];
    let currentSentence = '';
    let state = State.Normal;
    let quoteChar = '';
    let quoteLevel = 0;

    // First, protect certain patterns from being split
    const protectedText = normalizedText
        // Protect contractions
        .replace(/\b\w+'[a-z]\b/gi, match => match.replace(/'/g, '@APOS@'))
        // Protect decimal numbers (including currency)
        .replace(/\$?\d+\.\d+/g, match => match.replace('.', '@DECIMAL@'))
        // Protect ellipsis
        .replace(/\.{3,}/g, '@ELLIPSIS@')
        // Protect list item numbers like "1. Item", " 23. Item" (integer. space Uppercase)
        .replace(/(^|\s)(\d+\.)(?=\s*[A-Z])/g, (match, p1_start_or_space, p2_num_dot) => 
            p1_start_or_space + p2_num_dot.replace('.', '@LISTDOT@')
        )
        // Protect common abbreviations with numbers
        .replace(/(No|Chapter|Ch|Vol|v)\.\s*\d+(\.\d+)?/gi, 
            match => match.replace(/\./g, '@DOT@'))
        // Protect common abbreviations followed by period
        .replace(/\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|i\.e|e\.g|etc|Inc|Ltd|Co|St)\./gi,
            match => match.replace(/\./g, '@ABBR@'))
        // Protect single letter abbreviations (U.S., U.K., etc)
        .replace(/\b([A-Z]\.)+/g,
            match => match.replace(/\./g, '@SLDOT@'));

    // Helper function to check if a character is uppercase
    const isUpperCase = (char: string) => /[A-Z]/.test(char);

    const quotes = ['"', '"', "'", "\\u201C", "\\u201D", "\\u2018", "\\u2019"];
    
    function isEndOfSentence(pos: number, text: string, currentQuoteLevel: number): boolean {
        const char = text[pos];
        
        // Check if it's a sentence-ending character
        if (!'.!?'.includes(char)) return false;
        
        // If we're in a quote, the logic is complex; primary quote handling is in the main loop.
        // This check might need to be more sophisticated or coordinated with main loop's quote exit.
        // For now, if inside quote, assume not EoS unless it's a very clear pattern like ." or ?"
        if (currentQuoteLevel > 0) {
            const nextChar = text[pos+1] || '';
            if (!quotes.includes(nextChar)) { // If punctuation is not immediately followed by a closing quote
                 // A more robust check would see if the quote *is* closing.
                 // This simplified logic might misinterpret periods inside ongoing quotes.
                 // return false; // Tentatively, let main loop handle quote endings.
            }
        }
        
        const sliceStart = pos + 1;
        let nextNonSpace = '';
        let nextNonSpaceIdx = -1;

        for (let j = sliceStart; j < text.length; j++) {
            if (text[j] !== ' ') {
                nextNonSpace = text[j];
                nextNonSpaceIdx = j;
                break;
            }
        }

        if (!nextNonSpace) return true; // End of text after punctuation
        
        // If next non-space character is lowercase, it's not the end of a sentence.
        if (nextNonSpace.match(/[a-z]/)) {
            // Exception: if it's a closing quote followed by lowercase, it might be dialogue end.
            // e.g. "sentence." he said. This requires quote awareness.
            // The main loop quote handling should ideally manage this.
            return false;
        }
        
        // Avoid splitting if it looks like a decimal not caught by protection e.g. 3.4 (if protection failed)
        const prevChar = text[pos-1] || '';
        if (char === '.' && prevChar.match(/\\d/) && nextNonSpace.match(/\\d/)) {
            return false; 
        }

        return true; // Otherwise, it's an EoS
    }

    // Process each character
    for (let i = 0; i < protectedText.length; i++) {
        const char = protectedText[i];
        let boundaryFromEllipsisMarker = false; // Reset for each character/potential boundary
        
        // Handle quotes
        if (quotes.includes(char)) {
            if (quoteLevel > 0 && currentSentence.startsWith(char)) { // A simple check if the current char matches the initial quote char of the sentence
                quoteLevel--;
            } else if (quoteLevel === 0) {
                quoteLevel++;
            }
            // This quote logic is basic and might need future enhancement for correctness with complex/nested quotes.
        }
        
        currentSentence += char;
        
        let sentenceBoundaryFound = false;
        let markerLength = 0;
        let originalCharHandledByMarker = false;

        if ('.!?'.includes(char)) {
            if (isEndOfSentence(i, protectedText, quoteLevel)) {
                sentenceBoundaryFound = true;
            }
        } else if (char === '@') { // Check for our custom markers
            const markerCandidate = protectedText.substring(i);
            originalCharHandledByMarker = true; // The '@' char is part of a marker

            if (markerCandidate.startsWith('@ELLIPSIS@')) {
                markerLength = "@ELLIPSIS@".length;
                currentSentence += markerCandidate.substring(1, markerLength); 
                sentenceBoundaryFound = true;
                boundaryFromEllipsisMarker = true; // Set the flag
            } else if (markerCandidate.startsWith('@ABBR@') || markerCandidate.startsWith('@DOT@')) {
                markerLength = markerCandidate.startsWith('@ABBR@') ? "@ABBR@".length : "@DOT@".length;
                
                let nextRelevantChar = '';
                let k = i + markerLength;
                while(k < protectedText.length && protectedText[k] === ' ') {
                    k++;
                }
                if (k < protectedText.length) {
                    nextRelevantChar = protectedText[k];
                }
                
                let splitThisMarker = false;
                if (!nextRelevantChar) { // End of text always splits
                    splitThisMarker = true;
                } else if (!nextRelevantChar.match(/[a-z]/)) { // Next is not lowercase (Uppercase, Digit, or Symbol)
                    splitThisMarker = true; // Default to split, then check exceptions

                    const twoCharsBeforeAt = i >= 2 ? protectedText.substring(i - 2, i) : ""; // e.g., "Mr" if current char at i is '@'
                    const threeCharsBeforeAt = i >= 3 ? protectedText.substring(i - 3, i) : ""; // e.g., "Mrs"
                    const fourCharsBeforeAt = i >= 4 ? protectedText.substring(i - 4, i) : ""; // e.g., "Prof"
                    
                    // Exception for titles (Mr., Dr., etc.) followed by an Uppercase letter (potential name)
                    if (nextRelevantChar.match(/[A-Z]/) && markerCandidate.startsWith('@ABBR@')) {
                        if (twoCharsBeforeAt === 'Mr' || twoCharsBeforeAt === 'Ms' || twoCharsBeforeAt === 'Dr' || 
                            twoCharsBeforeAt === 'Sr' || twoCharsBeforeAt === 'Jr' || 
                            threeCharsBeforeAt === 'Mrs'|| fourCharsBeforeAt === 'Prof' ) {
                            splitThisMarker = false;
                        }
                    }
                    // Exception for "No." followed by a digit
                    else if (nextRelevantChar.match(/[0-9]/) && markerCandidate.startsWith('@DOT@')) {
                        if (twoCharsBeforeAt === 'No') {
                            splitThisMarker = false;
                        }
                    }
                }

                currentSentence += markerCandidate.substring(1, markerLength); // Consume the marker text regardless
                if (splitThisMarker) {
                    sentenceBoundaryFound = true;
                } else {
                    // No split, marker already consumed. Loop will advance i.
                }
            } else if (markerCandidate.startsWith('@SLDOT@')) {
                markerLength = "@SLDOT@".length;
                currentSentence += markerCandidate.substring(1, markerLength);
                // @SLDOT@ (from U.S. etc.) generally does not end a sentence by itself via marker logic.
            } else if (markerCandidate.startsWith('@LISTDOT@')) {
                markerLength = "@LISTDOT@".length;
                currentSentence += markerCandidate.substring(1, markerLength);
                // @LISTDOT@ is for protecting list item dots, not for splitting.
            } else {
                originalCharHandledByMarker = false; // Not one of our recognized markers
            }
        }
        
        if (sentenceBoundaryFound) {
            let finalCharPosInSentence = i;
            if (originalCharHandledByMarker) {
                finalCharPosInSentence = i + markerLength -1; // End of the marker
            }
            
            i = finalCharPosInSentence; // Update i to the end of the marker/punctuation

            // Extend to capture multi-character punctuation like "?!" or "!!"
            // This check should be for the original character if it was a punctuation, 
            // or if a marker itself represents a punctuation (e.g. @ELLIPSIS@)
            // For simplicity, let's assume if sentenceBoundaryFound is true, we check starting from i.
            let endOfTruePunctuation = i;
            let lookaheadIndex = i + 1;
            while (lookaheadIndex < protectedText.length && '.!?'.includes(protectedText[lookaheadIndex])) {
                // Only append if not already part of a multi-char marker like @ELLIPSIS@ that was already consumed.
                if (!boundaryFromEllipsisMarker) { // Use the flag here
                    currentSentence += protectedText[lookaheadIndex];
                    endOfTruePunctuation = lookaheadIndex;
                }
                lookaheadIndex++;
            }
            i = endOfTruePunctuation; // Update i to the actual end of all adjacent basic punctuation

            // Include any closing quotes or parentheses immediately following the sentence end
            let nextPosForLoopLookahead = i + 1;
            while (nextPosForLoopLookahead < protectedText.length && 
                   (quotes.includes(protectedText[nextPosForLoopLookahead]) || protectedText[nextPosForLoopLookahead] === ')')
            ) {
                currentSentence += protectedText[nextPosForLoopLookahead];
                i = nextPosForLoopLookahead; // Move i to include the quote/parenthesis
                nextPosForLoopLookahead++;
            }
            
            if (currentSentence.trim()) {
                sentences.push(currentSentence.trim());
                currentSentence = '';
                quoteLevel = 0; // Reset quote level for new sentence
            }
        } else if (originalCharHandledByMarker && markerLength > 0) {
            // If a marker was processed but didn't cause a split, advance i by its length
            i += markerLength - 1; // -1 because loop already increments by 1
        }
    }

    // Add any remaining sentence
    if (currentSentence.trim()) {
        sentences.push(currentSentence.trim());
    }

    // Restore the protected patterns and clean up
    return sentences
        .map(sentence => {
            // Restore all protected patterns
            let restored = sentence
                .replace(/@DECIMAL@/g, '.')
                .replace(/@ELLIPSIS@/g, '...')
                .replace(/@DOT@/g, '.')
                .replace(/@ABBR@/g, '.')
                .replace(/@SLDOT@/g, '.')
                .replace(/@LISTDOT@/g, '.')
                .replace(/@APOS@/g, "'")
                .trim();
            
            // Add period if sentence doesn't end with punctuation, quote, or closing parenthesis
            if (!/[.!?\)]['"]*$/.test(restored)) { // Added \) to the character class
                restored += '.';
            }

            return restored;
        })
        .filter(s => s.length > 0);
}