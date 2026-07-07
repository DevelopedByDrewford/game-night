import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { createRoom } from '../utils/rooms.js';
import { PageWrap } from '../components/layout/PageWrap.jsx';
import { RoomChromeHeader } from '../components/layout/RoomChromeHeader.jsx';
import { Button } from '../components/ui/Button.jsx';
import { SegmentedControl } from '../components/ui/SegmentedControl.jsx';
import { Toggle } from '../components/ui/Toggle.jsx';

const Title = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 36px;
  letter-spacing: -1px;
  margin-bottom: 4px;
  text-shadow: 0 2px 14px rgba(200, 89, 47, 0.18);
`;

const Subtitle = styled.div`
  font-size: 15px;
  color: rgba(46, 32, 19, 0.6);
  margin-bottom: 30px;
`;

const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.card};
  padding: 26px;
  box-shadow: ${({ theme }) => theme.shadows.card};
  display: flex;
  flex-direction: column;
  gap: 26px;
`;

const SectionLabel = styled.div`
  font-weight: 700;
  font-size: 15px;
  margin-bottom: 12px;
`;

const StepperRow = styled.div`
  display: flex;
  align-items: center;
  gap: 18px;
`;

const StepperButton = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
  cursor: pointer;
  background: #fff;
`;

const StepperValue = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 32px;
  width: 40px;
  text-align: center;
`;

const StepperHint = styled.div`
  font-size: 13px;
  color: rgba(46, 32, 19, 0.55);
`;

const ToggleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ToggleTitle = styled.div`
  font-weight: 700;
  font-size: 15px;
`;

const ToggleDesc = styled.div`
  font-size: 12px;
  color: rgba(46, 32, 19, 0.55);
  margin-top: 2px;
`;

const InviteSection = styled.div`
  border-top: 2px dashed rgba(46, 32, 19, 0.3);
  padding-top: 22px;
`;

const InviteRow = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`;

const Code = styled.div`
  flex: 1;
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 22px;
  letter-spacing: 6px;
  text-align: center;
  padding: 12px;
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.pageBg};
  font-weight: 700;
`;

const SmallButton = styled.button`
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  padding: 12px 18px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color || 'inherit'};

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ErrorText = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.terracotta};
`;

const RULESET_OPTIONS = [
  { value: 'classic', label: 'Classic' },
  { value: 'rumor', label: 'Rumor Variant' },
];

export function CreateRoomContainer() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [playerCount, setPlayerCount] = useState(4);
  const [ruleset, setRuleset] = useState('classic');
  const [autoSkip, setAutoSkip] = useState(false);
  const [room, setRoom] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const createStarted = useRef(false);

  // Create the room doc as soon as this screen opens (with default settings)
  // so the invite code is real and shareable immediately; final player
  // count/ruleset/auto-skip choices are saved when "Create Room" is clicked.
  useEffect(() => {
    if (!user || createStarted.current) return;
    createStarted.current = true;

    createRoom({
      hostUid: user.uid,
      hostDisplayName: user.displayName || 'Host',
      playerCount,
      ruleset,
      autoSkip,
    })
      .then(setRoom)
      .catch((err) => {
        console.error('[CreateRoomContainer] failed to create room', err);
        setError("Couldn't create a room — check your Firebase setup and try again.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleCreate() {
    if (!room) return;
    setSubmitting(true);
    setError(null);
    try {
      await updateDoc(doc(db, 'gameRooms', room.roomId), {
        settings: { playerCount, ruleset, autoSkipEnabled: autoSkip, autoSkipMinutes: 10 },
        updatedAt: serverTimestamp(),
      });
      navigate(`/rooms/${room.roomId}`);
    } catch (err) {
      console.error('[CreateRoomContainer] failed to save room settings', err);
      setError("Couldn't save your settings — try again.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <RoomChromeHeader title="Set Up Your Table" />
      <PageWrap $maxWidth="640px" $padding="44px 32px">
        <Title>Set Up Your Table</Title>
        <Subtitle>Love Letter · configure before you invite friends.</Subtitle>

        <Card>
          <div>
            <SectionLabel>Player count</SectionLabel>
            <StepperRow>
              <StepperButton onClick={() => setPlayerCount((c) => Math.max(2, c - 1))}>–</StepperButton>
              <StepperValue>{playerCount}</StepperValue>
              <StepperButton onClick={() => setPlayerCount((c) => Math.min(8, c + 1))}>+</StepperButton>
              <StepperHint>players (2–8)</StepperHint>
            </StepperRow>
          </div>

          <div>
            <SectionLabel>Ruleset</SectionLabel>
            <SegmentedControl options={RULESET_OPTIONS} value={ruleset} onChange={setRuleset} />
          </div>

          <ToggleRow>
            <div>
              <ToggleTitle>Auto-skip inactive players</ToggleTitle>
              <ToggleDesc>Skip a turn if a player doesn't act in time</ToggleDesc>
            </div>
            <Toggle checked={autoSkip} onChange={setAutoSkip} />
          </ToggleRow>

          <InviteSection>
            <SectionLabel>Invite code</SectionLabel>
            <InviteRow>
              <Code>{room?.code || '····'}</Code>
              <SmallButton $bg="#E3A73E" disabled={!room} onClick={() => navigator.clipboard?.writeText(room.code)}>
                Copy
              </SmallButton>
              <SmallButton $bg="#7C8C4A" $color="#F5ECD8" disabled={!room}>
                Share
              </SmallButton>
            </InviteRow>
          </InviteSection>

          {error && <ErrorText>{error}</ErrorText>}

          <Button $fullWidth disabled={!room || submitting} onClick={handleCreate}>
            Create Room →
          </Button>
        </Card>
      </PageWrap>
    </>
  );
}
