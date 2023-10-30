import { Clef } from './clef';
import { Config } from './config';
import { Division } from './division';
import { StemDirection } from './enums';
import { Voice, VoiceEntry, VoiceRendering } from './voice';
import * as musicxml from '@/musicxml';
import * as util from '@/util';
import * as vexflow from 'vexflow';
import * as conversions from './conversions';
import { MeasureEntry, StaveSignature } from './stavesignature';
import { TimeSignature } from './timesignature';
import { KeySignature } from './keysignature';
import { Token } from './token';
import { GhostNote } from './ghostnote';
import { Chord } from './chord';
import { Rest } from './rest';
import { Note } from './note';

/** The result of rendering a chorus. */
export type ChorusRendering = {
  type: 'chorus';
  voices: VoiceRendering[];
};

type VoiceEntryData = {
  voiceId: string;
  note: musicxml.Note;
  tokens: Array<Token>;
  stem: StemDirection;
  start: Division;
  end: Division;
};

type WholeRestChorusData = { type: 'wholerest' };

type MultiVoiceChorusData = {
  type: 'multivoice';
  quarterNoteDivisions: number;
  measureEntries: MeasureEntry[];
  keySignature: KeySignature;
};

type ChorusData = WholeRestChorusData | MultiVoiceChorusData;

/**
 * Represents a collection or cluster of musical voices within a single measure.
 *
 * This is *not* the same as a chorus from songwriting.
 *
 * The `Chorus` class encapsulates the harmonization and interaction of multiple voices, ensuring that the voices can be
 * interpreted, rendered, and managed cohesively.
 */
export class Chorus {
  private config: Config;
  private data: ChorusData;
  private clef: Clef;
  private timeSignature: TimeSignature;

  private constructor(opts: { config: Config; data: ChorusData; clef: Clef; timeSignature: TimeSignature }) {
    this.config = opts.config;
    this.data = opts.data;
    this.clef = opts.clef;
    this.timeSignature = opts.timeSignature;
  }

  /** Creates a Chorus with multiple voices. */
  static multiVoice(opts: {
    config: Config;
    timeSignature: TimeSignature;
    clef: Clef;
    quarterNoteDivisions: number;
    measureEntries: MeasureEntry[];
    keySignature: KeySignature;
  }): Chorus {
    return new Chorus({
      config: opts.config,
      data: {
        type: 'multivoice',
        keySignature: opts.keySignature,
        measureEntries: opts.measureEntries,
        quarterNoteDivisions: opts.quarterNoteDivisions,
      },
      timeSignature: opts.timeSignature,
      clef: opts.clef,
    });
  }

  /** Creates a Chorus with a single voice that is a single whole note rest. */
  static wholeRest(opts: { config: Config; timeSignature: TimeSignature; clef: Clef }): Chorus {
    return new Chorus({
      config: opts.config,
      data: { type: 'wholerest' },
      timeSignature: opts.timeSignature,
      clef: opts.clef,
    });
  }

  /** Returns the minimum justify width for the stave in a measure context. */
  @util.memoize()
  getMinJustifyWidth(): number {
    const voices = this.getVoices();
    if (voices.length > 0) {
      const vfVoices = voices.map((voice) => voice.render().vexflow.voice);
      const vfFormatter = new vexflow.Formatter();
      return vfFormatter.joinVoices(vfVoices).preCalculateMinTotalWidth(vfVoices) + this.config.VOICE_PADDING;
    }
    return 0;
  }

  /** Renders the Chorus. */
  render(): ChorusRendering {
    const voiceRenderings = this.getVoices().map((voice) => voice.render());

    return {
      type: 'chorus',
      voices: voiceRenderings,
    };
  }

  @util.memoize()
  private getVoices(): Voice[] {
    switch (this.data.type) {
      case 'wholerest':
        return this.createWholeRest();
      case 'multivoice':
        return this.createMultiVoice({
          keySignature: this.data.keySignature,
          measureEntries: this.data.measureEntries,
          quarterNoteDivisions: this.data.quarterNoteDivisions,
        });
    }
  }

  private createWholeRest(): Voice[] {
    return [
      Voice.wholeRest({
        config: this.config,
        timeSignature: this.timeSignature,
        clef: this.clef,
      }),
    ];
  }

  private createMultiVoice(opts: {
    quarterNoteDivisions: number;
    measureEntries: MeasureEntry[];
    keySignature: KeySignature;
  }): Voice[] {
    const voiceEntryData = this.computeVoiceEntryData({
      measureEntries: opts.measureEntries,
      quarterNoteDivisions: opts.quarterNoteDivisions,
    });

    this.adjustStems(voiceEntryData);

    return this.computeFullyQualifiedVoices({
      voiceEntryData,
      keySignature: opts.keySignature,
      quarterNoteDivisions: opts.quarterNoteDivisions,
    });
  }

  private computeVoiceEntryData(opts: {
    quarterNoteDivisions: number;
    measureEntries: MeasureEntry[];
  }): Record<string, VoiceEntryData[]> {
    const result: Record<string, VoiceEntryData[]> = {};

    let quarterNoteDivisions = opts.quarterNoteDivisions;
    let divisions = Division.of(0, quarterNoteDivisions);
    let tokens = new Array<Token>();

    // Create the initial voice data. We won't be able to know the stem directions until it's fully populated.
    for (const entry of opts.measureEntries) {
      if (entry instanceof StaveSignature) {
        quarterNoteDivisions = entry.getQuarterNoteDivisions();
      }

      if (entry instanceof musicxml.Direction) {
        entry
          .getTypes()
          .map((directionType) => directionType.getContent())
          .filter((content): content is musicxml.TokensDirectionTypeContent => content.type === 'tokens')
          .flatMap((content) => content.tokens)
          .forEach((token) => {
            tokens.push(new Token({ musicXml: { token } }));
          });
      }

      if (entry instanceof musicxml.Note) {
        const note = entry;

        if (note.isGrace()) {
          continue;
        }
        if (note.isChordTail()) {
          continue;
        }

        const voiceId = note.getVoice();

        result[voiceId] ??= [];

        const noteDuration = Division.of(note.getDuration(), quarterNoteDivisions);
        const startDivision = divisions;
        const endDivision = startDivision.add(noteDuration);

        const stem = conversions.fromStemToStemDirection(note.getStem());

        result[voiceId].push({
          voiceId,
          note,
          tokens,
          start: startDivision,
          end: endDivision,
          stem,
        });

        divisions = divisions.add(noteDuration);
        tokens = [];
      }

      if (entry instanceof musicxml.Backup) {
        const backupDuration = Division.of(entry.getDuration(), quarterNoteDivisions);
        divisions = divisions.subtract(backupDuration);
      }

      if (entry instanceof musicxml.Forward) {
        const forwardDuration = Division.of(entry.getDuration(), quarterNoteDivisions);
        divisions = divisions.add(forwardDuration);
      }
    }

    return result;
  }

  /**
   * Adjusts the stems based on the first non-rest note of each voice by mutating the voice entry data in place.
   *
   * This method does _not_ change any stem directions that were explicitly defined in the MusicXML document.
   */
  private adjustStems(voiceEntryData: Record<string, VoiceEntryData[]>): void {
    const voiceIds = Object.keys(voiceEntryData);

    const firstNonRestVoiceEntries = voiceIds
      .map((voiceId) => voiceEntryData[voiceId].find((entry) => !entry.note.isRest()))
      .filter((entry): entry is VoiceEntryData => typeof entry !== 'undefined');

    // Sort the notes by descending line based on the entry's highest note. This allows us to figure out which voice
    // should be on top, middle, and bottom easily.
    util.sortBy(firstNonRestVoiceEntries, (entry) => -this.staveNoteLine(entry.note, this.clef));

    if (firstNonRestVoiceEntries.length > 1) {
      const stems: { [voiceId: string]: StemDirection } = {};

      const top = util.first(firstNonRestVoiceEntries)!;
      const middle = firstNonRestVoiceEntries.slice(1, -1);
      const bottom = util.last(firstNonRestVoiceEntries)!;

      stems[top.voiceId] = 'up';
      stems[bottom.voiceId] = 'down';
      for (const entry of middle) {
        stems[entry.voiceId] = 'none';
      }

      for (const voiceId of voiceIds) {
        for (const entry of voiceEntryData[voiceId]) {
          // Only change stems that haven't been explicitly specified.
          if (entry.stem === 'auto') {
            entry.stem = stems[voiceId];
          }
        }
      }
    }
  }

  /** Returns the line that the note would be rendered on. */
  private staveNoteLine(note: musicxml.Note, clef: Clef): number {
    return new vexflow.StaveNote({
      duration: '4',
      keys: [note, ...note.getChordTail()].map((note) => {
        const step = note.getStep();
        const octave = note.getOctave() - clef.getOctaveChange();
        const notehead = note.getNotehead();
        const suffix = conversions.fromNoteheadToNoteheadSuffix(notehead);
        return suffix ? `${step}/${octave}/${suffix}` : `${step}/${octave}`;
      }),
    }).getKeyLine(0);
  }

  private computeFullyQualifiedVoices(opts: {
    voiceEntryData: Record<string, VoiceEntryData[]>;
    quarterNoteDivisions: number;
    keySignature: KeySignature;
  }): Voice[] {
    const result = new Array<Voice>();

    const voiceEntryData = opts.voiceEntryData;
    const quarterNoteDivisions = opts.quarterNoteDivisions;
    const keySignature = opts.keySignature;
    const config = this.config;
    const clef = this.clef;
    const timeSignature = this.timeSignature;

    for (const voiceId of Object.keys(voiceEntryData)) {
      let divisions = Division.of(0, quarterNoteDivisions);
      const entries = new Array<VoiceEntry>();

      for (const entry of opts.voiceEntryData[voiceId]) {
        const ghostNoteStart = divisions;
        const ghostNoteEnd = entry.start;
        const ghostNoteDuration = ghostNoteEnd.subtract(ghostNoteStart);

        if (ghostNoteDuration.toBeats() > 0) {
          entries.push(
            new GhostNote({
              durationDenominator: conversions.fromDivisionsToNoteDurationDenominator(ghostNoteDuration),
            })
          );
        }

        const note = entry.note;
        const stem = entry.stem;
        const tokens = entry.tokens;

        const noteDuration = entry.end.subtract(entry.start);
        const durationDenominator =
          conversions.fromNoteTypeToNoteDurationDenominator(note.getType()) ??
          conversions.fromDivisionsToNoteDurationDenominator(noteDuration);

        if (note.isChordHead()) {
          entries.push(
            new Chord({
              config,
              musicXml: { note },
              tokens,
              stem,
              clef,
              durationDenominator,
              keySignature,
            })
          );
        } else if (note.isRest()) {
          entries.push(
            new Rest({
              config,
              musicXml: { note },
              displayPitch: note.getRestDisplayPitch(),
              dotCount: note.getDotCount(),
              tokens,
              clef,
              durationDenominator,
            })
          );
        } else {
          entries.push(
            new Note({
              config,
              musicXml: { note },
              tokens,
              stem,
              clef,
              durationDenominator,
              keySignature,
            })
          );
        }

        divisions = entry.end;
      }

      const voice = new Voice({
        config,
        entries,
        timeSignature,
      });
      result.push(voice);
    }

    return result;
  }
}
