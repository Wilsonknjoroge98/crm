import { useId } from 'react';
import {
  ACCENT,
  HAIRLINE,
  INK,
  INK_RULE,
  NEUTRAL,
  SLATE_MUTED,
  WHITE,
} from './tokens';
import './HeroHandoff.css';

/** A fictional, selected Website quote becomes an agent's first conversation.
 * No live activity, interactive controls, or delivery/verification guarantees.
 */
export default function HeroHandoff() {
  const captionId = useId();

  return (
    <figure
      className='fex-handoff'
      aria-labelledby={captionId}
      style={{
        '--handoff-ink': INK,
        '--handoff-slate': ACCENT,
        '--handoff-rule': HAIRLINE,
        '--handoff-paper': WHITE,
        '--handoff-neutral': NEUTRAL,
        '--handoff-body': SLATE_MUTED,
        '--handoff-on-ink-rule': INK_RULE,
      }}
    >
      <div className='fex-handoff__scene' aria-hidden='true'>
        <svg className='fex-handoff__thread' viewBox='0 0 560 480' fill='none'>
          <path
            className='fex-handoff__thread-base'
            d='M332 218c55 0 86 29 86 83'
          />
          {/* The last 35% becomes one continuous stroke as it meets
              the delivery slip: considered intent becomes a connection. */}
          <path
            className='fex-handoff__thread-join'
            pathLength='100'
            d='M332 218c55 0 86 29 86 83'
          />
        </svg>

        <span className='fex-handoff__annotation fex-handoff__annotation--start'>
          01 / Chosen by your lead
        </span>

        <div className='fex-handoff__folio'>
          <div className='fex-handoff__sheet fex-handoff__sheet--back' />
          <div className='fex-handoff__quote'>
            <div className='fex-handoff__eyebrow'>
              Example lead / quote record
            </div>
            <div className='fex-handoff__quote-title'>Leave a legacy.</div>
            <div className='fex-handoff__eyebrow fex-handoff__selected-label'>
              Her selected plan
            </div>
            <div className='fex-handoff__coverage'>
              $68<span>/mo</span>
            </div>
            <div className='fex-handoff__plan'>Whole life · $25,000</div>
            <div className='fex-handoff__carrier'>A-rated carrier</div>
            <div className='fex-handoff__verified'>
              <svg viewBox='0 0 20 20' fill='none'>
                <path d='m5 10 3 3 7-7' />
              </svg>{' '}
              Phone verified
            </div>
          </div>
        </div>

        <div className='fex-handoff__delivery'>
          <div className='fex-handoff__delivery-top'>
            <span className='fex-handoff__mark'>
              <img src='/icon.svg' alt='' />
            </span>
            <span className='fex-handoff__delivery-brand'>
              FEX Digital<span>Lead delivered</span>
            </span>
            <svg
              className='fex-handoff__arrival'
              viewBox='0 0 24 24'
              fill='none'
            >
              <path d='M5 12h14m-6-6 6 6-6 6' />
            </svg>
          </div>
          <div className='fex-handoff__delivery-name'>
            Margaret H. <span>· Ohio</span>
          </div>
          <div className='fex-handoff__delivery-summary'>
            Quote details in your CRM
          </div>
          <div className='fex-handoff__delivery-footer'>
            The plan. The premium. The reason.
          </div>
        </div>
        <span className='fex-handoff__annotation fex-handoff__annotation--end'>
          02 / In your hands
        </span>
      </div>
      {/* <figcaption className='fex-handoff__caption' id={captionId}>
        Illustrative Website lead.
        <span className='fex-handoff__sr-only'>
          {' '}
          A shopper compares quotes, selects $25,000 of whole-life coverage at
          $68 a month to leave a legacy, and verifies her phone. Her selected
          quote details are delivered to the agent.
        </span>
      </figcaption> */}
    </figure>
  );
}
