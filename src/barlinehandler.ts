import * as msg from './msg';
import { NodeHandler, NodeHandlerCtx } from './nodehandler';
import { VexmlMessageReceiver } from './types';

/**
 * Produces vexml messages from <barline> nodes.
 *
 * https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/barline/
 */
export class BarlineHandler extends NodeHandler<'barline'> {
  sendMessages(receiver: VexmlMessageReceiver, ctx: NodeHandlerCtx<'barline'>): void {
    const message = msg.barline({
      barStyle: this.getBarStyle(ctx),
      repeatDirection: this.getRepeatDirection(ctx),
      location: this.getLocation(ctx),
      ending: this.getEnding(ctx),
    });
    receiver.onMessage(message);
  }

  private getBarStyle(ctx: NodeHandlerCtx<'barline'>): string | null {
    return ctx.node.asElement().getElementsByTagName('bar-style').item(0)?.textContent ?? null;
  }

  private getRepeatDirection(ctx: NodeHandlerCtx<'barline'>): string | null {
    return ctx.node.asElement().getElementsByTagName('repeat').item(0)?.getAttribute('direction') ?? null;
  }

  private getLocation(ctx: NodeHandlerCtx<'barline'>): string {
    return ctx.node.asElement().getAttribute('location') ?? 'right';
  }

  private getEnding(ctx: NodeHandlerCtx<'barline'>): { number: string; type: string; text: string } | null {
    const ending = ctx.node.asElement().getElementsByTagName('ending').item(0);
    if (ending) {
      const number = ending.getAttribute('number') ?? '';
      const type = ending.getAttribute('type') ?? '';
      const text = ending.textContent ?? number;
      return { number, type, text };
    } else {
      return null;
    }
  }
}
