import { NoopReceiver } from './noopreceiver';
import { TodoHandler } from './todohandler';
import * as xml from './xml';

describe('TodoHandler', () => {
  let todoHandler: TodoHandler;
  let receiver: NoopReceiver;

  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    todoHandler = new TodoHandler();
    receiver = new NoopReceiver();
    warnSpy = jest.spyOn(console, 'warn').mockReturnValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('prints a warning', () => {
    const node = xml.part();

    todoHandler.sendMessages(receiver, { node });

    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy).toHaveBeenCalledWith(`TODO: unimplemented node handler for '<part>'`);
  });
});