import { Attributes } from '@/musicxml/attributes';
import { Clef } from '@/musicxml/clef';
import { Key } from '@/musicxml/key';
import { Time } from '@/musicxml/time';
import { StaffDetails } from '@/musicxml/staffdetails';
import { xml } from '@/util';

describe(Attributes, () => {
  describe('getStaveCount', () => {
    it('returns the number of staves', () => {
      const node = xml.attributes({ staves: xml.staves({ staveCount: 4 }) });
      const attributes = new Attributes(node);
      expect(attributes.getStaveCount()).toBe(4);
    });

    it('returns 1 when there is no staves element', () => {
      const node = xml.attributes();
      const attributes = new Attributes(node);
      expect(attributes.getStaveCount()).toBe(1);
    });

    it('returns 1 when the staves element is empty', () => {
      const node = xml.attributes({ staves: xml.staves() });
      const attributes = new Attributes(node);
      expect(attributes.getStaveCount()).toBe(1);
    });

    it('returns 1 when the staves text content is invalid', () => {
      const node = xml.attributes({ staves: xml.staves({ staveCount: NaN }) });
      const attributes = new Attributes(node);
      expect(attributes.getStaveCount()).toBe(1);
    });
  });

  describe('getTimes', () => {
    it('returns the times', () => {
      const time = xml.time({
        times: [{ beats: xml.beats({ value: '3' }), beatType: xml.beatType({ value: '8' }) }],
      });
      const node = xml.attributes({ times: [time] });
      const attributes = new Attributes(node);
      expect(attributes.getTimes()).toStrictEqual([new Time(time)]);
    });

    it('returns an empty array when times are missing', () => {
      const node = xml.attributes();
      const attributes = new Attributes(node);
      expect(attributes.getTimes()).toBeEmpty();
    });
  });

  describe('getKeys', () => {
    it('returns the keys', () => {
      const key = xml.key();
      const node = xml.attributes({ keys: [key] });
      const attributes = new Attributes(node);
      expect(attributes.getKeys()).toStrictEqual([new Key(key)]);
    });

    it('returns an empty array when keys are missing', () => {
      const node = xml.attributes();
      const attributes = new Attributes(node);
      expect(attributes.getKeys()).toBeEmpty();
    });
  });

  describe('getClefs', () => {
    it('returns the clefs', () => {
      const clef = xml.clef();
      const node = xml.attributes({ clefs: [clef] });
      const attributes = new Attributes(node);
      expect(attributes.getClefs()).toStrictEqual([new Clef(clef)]);
    });

    it('returns an empty array when keys are missing', () => {
      const node = xml.attributes();
      const attributes = new Attributes(node);
      expect(attributes.getClefs()).toBeEmpty();
    });
  });

  describe('getStaffDetails', () => {
    it('returns the staff details', () => {
      const staffDetails1 = xml.staffDetails();
      const staffDetails2 = xml.staffDetails();
      const node = xml.attributes({ staffDetails: [staffDetails1, staffDetails2] });

      const attributes = new Attributes(node);

      expect(attributes.getStaffDetails()).toStrictEqual([
        new StaffDetails(staffDetails1),
        new StaffDetails(staffDetails2),
      ]);
    });

    it('returns an empty array when staff details are missing', () => {
      const node = xml.attributes({});
      const attributes = new Attributes(node);
      expect(attributes.getStaffDetails()).toBeEmpty();
    });
  });
});
