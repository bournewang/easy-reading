import { splitIntoSentences } from '../sentenceSplitter';

describe('splitIntoSentences', () => {
    test('handles basic sentences', () => {
        const text = 'Hello world. This is a test.';
        const result = splitIntoSentences(text);
        //console.log('\nBasic sentences test:');
        //console.log('Input:', text);
        //console.log('Output:', result);
        expect(result).toEqual([
            'Hello world.',
            'This is a test.'
        ]);
    });

    test('handles contractions', () => {
        const text = "There's nothing out there. Don't worry.";
        const result = splitIntoSentences(text);
        //console.log('\nContractions test:');
        //console.log('Input:', text);
        //console.log('Output:', result);
        expect(result).toEqual([
            "There's nothing out there.",
            "Don't worry."
        ]);
    });

    test('handles quotes and dialogue', () => {
        const text = '"Perhaps not," Alice cautiously replied: "but I know I have to beat time when I learn music."';
        const result = splitIntoSentences(text);
        //console.log('\nQuotes and dialogue test:');
        //console.log('Input:', text);
        //console.log('Output:', result);
        expect(result).toEqual([
            '"Perhaps not," Alice cautiously replied: "but I know I have to beat time when I learn music."'
        ]);
    });

    test('handles abbreviations', () => {
        const text = 'Mr. Smith went to No. 7 Baker St. He was looking for Dr. Watson.';
        const result = splitIntoSentences(text);
        //console.log('\nAbbreviations test:');
        //console.log('Input:', text);
        //console.log('Output:', result);
        expect(result).toEqual([
            'Mr. Smith went to No. 7 Baker St.',
            'He was looking for Dr. Watson.'
        ]);
    });

    test('handles numbers and decimals', () => {
        const text = 'The price is $3.14. That\'s a good deal!';
        const result = splitIntoSentences(text);
        //console.log('\nNumbers and decimals test:');
        //console.log('Input:', text);
        //console.log('Output:', result);
        expect(result).toEqual([
            'The price is $3.14.',
            "That's a good deal!"
        ]);
    });

    test('handles company names', () => {
        const text = 'He works for Apple Inc. They make great products.';
        const result = splitIntoSentences(text);
        //console.log('\nCompany names test:');
        //console.log('Input:', text);
        //console.log('Output:', result);
        expect(result).toEqual([
            'He works for Apple Inc.',
            'They make great products.'
        ]);
    });

    test('handles ellipsis', () => {
        const text = 'First sentence... Second sentence.';
        const result = splitIntoSentences(text);
        //console.log('\nEllipsis test:');
        //console.log('Input:', text);
        //console.log('Output:', result);
        expect(result).toEqual([
            'First sentence...',
            'Second sentence.'
        ]);
    });

    test('handles single letter abbreviations', () => {
        const text = 'The U.S. is a country. The U.K. is another.';
        const result = splitIntoSentences(text);
        //console.log('\nSingle letter abbreviations test:');
        //console.log('Input:', text);
        //console.log('Output:', result);
        expect(result).toEqual([
            'The U.S. is a country.',
            'The U.K. is another.'
        ]);
    });

    test('handles complex cases', () => {
        const text = 'Chapter 3.2 begins here. This is interesting i.e. very good.';
        const result = splitIntoSentences(text);
        //console.log('\nComplex cases test:');
        //console.log('Input:', text);
        //console.log('Output:', result);
        expect(result).toEqual([
            'Chapter 3.2 begins here.',
            'This is interesting i.e. very good.'
        ]);
    });

    test('handles alternative end punctuation', () => {
        const text1 = 'Hello world! This is a test?';
        const result1 = splitIntoSentences(text1);
        //console.log('\nAlternative punctuation test 1:');
        //console.log('Input:', text1);
        //console.log('Output:', result1);
        expect(result1).toEqual([
            'Hello world!',
            'This is a test?'
        ]);

        const text2 = 'Is this a test?! Yes!';
        const result2 = splitIntoSentences(text2);
        //console.log('\nAlternative punctuation test 2:');
        //console.log('Input:', text2);
        //console.log('Output:', result2);
        expect(result2).toEqual([
            'Is this a test?!',
            'Yes!'
        ]);
    });

    test('handles more complex quoting', () => {
        const text1 = 'He said, "This is sentence one. This is sentence two."';
        const result1 = splitIntoSentences(text1);
        //console.log('\nComplex quoting test 1:');
        //console.log('Input:', text1);
        //console.log('Output:', result1);
        // Current logic might keep quotes together or split. Assuming split for now.
        expect(result1).toEqual([
            'He said, "This is sentence one.',
            'This is sentence two."'
        ]);

        const text2 = '"I am here," she said. "Where are you?"';
        const result2 = splitIntoSentences(text2);
        //console.log('\nComplex quoting test 2 (dialogue attribution):');
        //console.log('Input:', text2);
        //console.log('Output:', result2);
        expect(result2).toEqual([
            '"I am here," she said.',
            '"Where are you?"'
        ]);
    });

    test('handles abbreviations at end of text', () => {
        const text1 = 'He is Mr. Smith.';
        const result1 = splitIntoSentences(text1);
        //console.log('\nAbbreviation at end of text 1:');
        //console.log('Input:', text1);
        //console.log('Output:', result1);
        expect(result1).toEqual(['He is Mr. Smith.']);

        const text2 = 'The company is Apple Inc.';
        const result2 = splitIntoSentences(text2);
        //console.log('\nAbbreviation at end of text 2:');
        //console.log('Input:', text2);
        //console.log('Output:', result2);
        expect(result2).toEqual(['The company is Apple Inc.']);
    });

    test('handles list-like structures', () => {
        const text = '1. First item. 2. Second item.';
        const result = splitIntoSentences(text);
        //console.log('\nList-like structure test:');
        //console.log('Input:', text);
        //console.log('Output:', result);
        expect(result).toEqual([
            '1. First item.',
            '2. Second item.'
        ]);
    });

    test('handles URLs and email addresses (basic check)', () => {
        const text = 'Please visit example.com for more. My email is test@example.com.';
        const result = splitIntoSentences(text);
        //console.log('\nURL/Email test:');
        //console.log('Input:', text);
        //console.log('Output:', result);
        // This test might show current limitations if URL/email parts are split.
        // Expected behavior for a highly robust splitter would be to keep them intact.
        // For now, we observe and expect splitting based on current heuristics.
        expect(result).toEqual([
            'Please visit example.com for more.', // Assuming example.com is not split by current logic
            'My email is test@example.com.' // Assuming test@example.com is not split
        ]);
    });

    test('handles boundary conditions for input', () => {
        const text1 = '';
        const result1 = splitIntoSentences(text1);
        //console.log('\nBoundary condition test (empty string):');
        //console.log('Input:', text1);
        //console.log('Output:', result1);
        expect(result1).toEqual([]);

        const text2 = '   ';
        const result2 = splitIntoSentences(text2);
        //console.log('\nBoundary condition test (whitespace only):');
        //console.log('Input:', text2);
        //console.log('Output:', result2);
        expect(result2).toEqual([]);

        const text3 = 'Just one phrase';
        const result3 = splitIntoSentences(text3);
        //console.log('\nBoundary condition test (no terminator):');
        //console.log('Input:', text3);
        //console.log('Output:', result3);
        expect(result3).toEqual(['Just one phrase.']);

        const text4 = '.';
        const result4 = splitIntoSentences(text4);
        //console.log('\nBoundary condition test (only period):');
        //console.log('Input:', text4);
        //console.log('Output:', result4);
        expect(result4).toEqual(['.']);
        
        const text5 = '...';
        const result5 = splitIntoSentences(text5);
        //console.log('\nBoundary condition test (only ellipsis):');
        //console.log('Input:', text5);
        //console.log('Output:', result5);
        expect(result5).toEqual(['...']);
    });

    test('handles sentences ending with punctuation inside parentheses/quotes', () => {
        const text = `" (and she tried to curtsey as she spoke—fancy curtseying as you're falling through the air! Do you think you could manage it?) "And what an ignorant little girl she'll think me for asking! No, it'll never do to ask: perhaps I shall see it written up somewhere."`;
        const result = splitIntoSentences(text);
        // console.log('\nParentheses/Quotes Endings Test:');
        // console.log('Input:', text);
        // console.log('Output:', result);
        expect(result).toEqual([
            `" (and she tried to curtsey as she spoke—fancy curtseying as you're falling through the air!`,
            `Do you think you could manage it?)`,
            `"And what an ignorant little girl she'll think me for asking!`,
            `No, it'll never do to ask: perhaps I shall see it written up somewhere."`
        ]);
    });

    // test('handles complex quotes and punctuation sequence', () => {
    //     const text = `said Alice; "I must be shutting up like a telescope.". "Come, there's no use in crying like that!" said Alice to herself, rather sharply; "I advise you to leave off this minute!"`;
    //     const result = splitIntoSentences(text);
    //     // console.log('Input (normalized):', text.replace(/\s+/g, ' '));
    //     // console.log('Output:', result);
    //     expect(result).toEqual([
    //         `" said Alice; "I must be shutting up like a telescope.".`,
    //         `"Come, there's no use in crying like that!"`,
    //         `said Alice to herself, rather sharply; "I advise you to leave off this minute!"`
    //     ]);
    // });

    test('handles punctuation immediately followed by quote', () => {
        // Ensure ?", !" etc. are handled correctly without splitting the quote off.
        const text = 'but it had no pictures or conversations in it, "and what is\nthe use of a book," thought Alice "without pictures or\nconversations?"';
        const result = splitIntoSentences(text);
        console.log('\nPunctuation+Quote Test:');
        console.log('Input:', text);
        console.log('Output:', result);
        expect(result).toEqual([
            'but it had no pictures or conversations in it, "and what is the use of a book," thought Alice "without pictures or conversations?"'
        ]);
    });

    test('handles nested quotes with em dash', () => {
        const text = '"Very true," said the Duchess: "flamingoes and mustard both\nbite. And the moral of that is—\'Birds of a feather flock\ntogether.\'"';
        const result = splitIntoSentences(text);
        console.log('\nNested Quotes Test:');
        console.log('Input:', text);
        console.log('Output:', result);
        expect(result).toEqual([
            '"Very true," said the Duchess: "flamingoes and mustard both bite. And the moral of that is—\'Birds of a feather flock together.\'"'
        ]);
    });

    // "Alice was beginning to get very tired of sitting by her sister on the bank, and\nof having nothing to do: once or twice she had peeped into the book her sister\nwas reading, but it had no pictures or conversations in it, "and what is\nthe use of a book," thought Alice "without pictures or\nconversations?""

}); 