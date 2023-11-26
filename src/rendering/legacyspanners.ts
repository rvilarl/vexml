import * as vexflow from 'vexflow';
import { Address } from './address';
import { Wedge, WedgeEntry, WedgeFragment, WedgeRendering } from './wedge';
import { OctaveShift, OctaveShiftEntry, OctaveShiftFragment, OctaveShiftRendering } from './octaveshift';
import { Vibrato, VibratoFragment, VibratoRendering } from './vibrato';
import { Pedal, PedalFragment, PedalRendering } from './pedal';

/** The result of rendering spanners. */
export type SpannersRendering = {
  type: 'spanners';
  wedges: WedgeRendering[];
  octaveShifts: OctaveShiftRendering[];
  vibratos: VibratoRendering[];
  pedals: PedalRendering[];
};

/**
 * Represents a piece of a spanner.
 *
 * Spanners are structures that involve groups of notes.
 *
 * Examples:
 *   - beams
 *   - tuplets
 *   - slurs
 */
export type SpannerFragment = WedgeFragment | OctaveShiftFragment | PedalFragment | VibratoFragment;

/** A `SpannerFragment` with metadata. */
export type SpannerEntry<T extends SpannerFragment = SpannerFragment> = {
  address: Address<'system'>;
  fragment: T;
};

/**
 * Houses **all** spanner structures that contain multiple notes.
 *
 * NB: This class is intentionally plural, because it doesn't make complete sense to represent a single spanner. This is
 * meant to hold the logic of creating _multiple_ spanners from a list of `SpannerFragments`. We don't want the caller
 * to have to delineate where each spanner stops.
 */
export class LegacySpanners {
  private entries: SpannerEntry[];

  constructor(opts: { entries: SpannerEntry[] }) {
    this.entries = opts.entries;
  }

  /** Renders the spanners. */
  render(): SpannersRendering {
    return {
      type: 'spanners',
      wedges: this.getWedges().map((wedge) => wedge.render()),
      octaveShifts: this.getOctaveShifts().map((octaveShift) => octaveShift.render()),
      vibratos: this.getVibratos().map((wavyLine) => wavyLine.render()),
      pedals: this.getPedals().map((pedal) => pedal.render()),
    };
  }

  private getWedges(): Wedge[] {
    const wedges = new Array<Wedge>();

    let vfStaveHairpinType = vexflow.StaveHairpin.type.CRESC;
    let vfPosition = vexflow.ModifierPosition.BELOW;
    let address = Address.system();
    let buffer = new Array<WedgeEntry>();

    function reset() {
      vfStaveHairpinType = vexflow.StaveHairpin.type.CRESC;
      vfPosition = vexflow.ModifierPosition.BELOW;
      address = Address.system();
      buffer = new Array<WedgeEntry>();
    }

    // NOTE: Underspecified wedges end up getting ignored.
    function addWedge() {
      if (buffer.length >= 2) {
        wedges.push(
          new Wedge({
            entries: buffer,
            vexflow: {
              position: vfPosition,
              staveHairpinType: vfStaveHairpinType,
            },
          })
        );
      }
    }

    const entries = this.entries.filter((entry): entry is WedgeEntry => entry.fragment.type === 'wedge');

    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index];
      const fragment = entry.fragment;
      const isLast = index === entries.length - 1;

      switch (fragment.phase) {
        case 'start':
          vfStaveHairpinType = fragment.vexflow.staveHairpinType;
          vfPosition = fragment.vexflow.position;
          address = entry.address;
          buffer.push(entry);
          break;
        case 'continue':
          if (entry.address.isMemberOf('system', address)) {
            buffer.push(entry);
          } else {
            // TODO: When an entry continues or stops on another system, validate that this renders correctly. You
            // might need to merge 'continue' and 'stop' cases and there might be a need to create a new entry to
            // satisfy Wedge's preconditions.
            addWedge();
            address = entry.address;
            buffer = [entry];
          }
          break;
        case 'stop':
          buffer.push(entry);
          addWedge();
          reset();
          break;
      }

      if (isLast) {
        addWedge();
      }
    }

    return wedges;
  }

  private getOctaveShifts(): OctaveShift[] {
    const octaveShifts = new Array<OctaveShift>();

    let text = '';
    let superscript = '';
    let textBracketPosition = vexflow.TextBracketPosition.BOTTOM;
    let address = Address.system();
    let buffer = new Array<OctaveShiftEntry>();

    function reset() {
      text = '';
      superscript = '';
      textBracketPosition = vexflow.TextBracketPosition.BOTTOM;
      buffer = [];
    }

    // NOTE: Underspecified octave shifts end up getting ignored.
    function addOctaveShift() {
      if (buffer.length >= 2) {
        octaveShifts.push(
          new OctaveShift({
            text,
            superscript,
            entries: buffer,
            position: textBracketPosition,
          })
        );
      }
    }

    const entries = this.entries.filter((entry): entry is OctaveShiftEntry => entry.fragment.type === 'octaveshift');

    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index];
      const fragment = entry.fragment;
      const isLast = index === entries.length - 1;

      switch (fragment.phase) {
        case 'start':
          text = fragment.text;
          superscript = fragment.superscript;
          textBracketPosition = fragment.vexflow.textBracketPosition;
          address = entry.address;
          buffer.push(entry);
          break;
        case 'continue':
          if (entry.address.isMemberOf('system', address)) {
            buffer.push(entry);
          } else {
            addOctaveShift();
            address = entry.address;
            buffer = [entry];
          }
          break;
        case 'stop':
          buffer.push(entry);
          addOctaveShift();
          reset();
          break;
      }

      if (isLast) {
        addOctaveShift();
      }
    }

    return octaveShifts;
  }

  private getVibratos(): Vibrato[] {
    const vibratos = new Array<Vibrato>();

    const fragments = this.entries
      .map((entry) => entry.fragment)
      .filter((fragment): fragment is VibratoFragment => fragment.type === 'vibrato');

    let buffer = new Array<VibratoFragment>();

    for (let index = 0; index < fragments.length; index++) {
      const fragment = fragments[index];
      const isLast = index === fragments.length - 1;

      switch (fragment.phase) {
        case 'start':
        case 'continue':
          buffer.push(fragment);
          break;
        case 'stop':
          buffer.push(fragment);
          vibratos.push(new Vibrato({ fragments: buffer }));
          buffer = [];
          break;
      }

      if (isLast && buffer.length > 0) {
        vibratos.push(new Vibrato({ fragments: buffer }));
      }
    }

    return vibratos;
  }

  private getPedals(): Pedal[] {
    const pedals = new Array<Pedal>();

    const fragments = this.entries
      .map((entry) => entry.fragment)
      .filter((fragment): fragment is PedalFragment => fragment.type === 'pedal');

    let buffer = new Array<PedalFragment>();

    for (let index = 0; index < fragments.length; index++) {
      const fragment = fragments[index];
      const isLast = index === fragments.length - 1;

      switch (fragment.phase) {
        case 'start':
        case 'continue':
          buffer.push(fragment);
          break;
        case 'stop':
          buffer.push(fragment);
          pedals.push(new Pedal({ fragments: buffer }));
          buffer = [];
          break;
      }

      if (isLast && buffer.length > 0) {
        pedals.push(new Pedal({ fragments: buffer }));
      }
    }

    return pedals;
  }
}
