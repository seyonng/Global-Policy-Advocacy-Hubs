(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-HUB-ID u101)
(define-constant ERR-INVALID-PROPOSAL-TEXT u102)
(define-constant ERR-INVALID-GOALS u103)
(define-constant ERR-INVALID-VOTING-DEADLINE u104)
(define-constant ERR-INVALID-THRESHOLD u105)
(define-constant ERR-PROPOSAL-ALREADY-EXISTS u106)
(define-constant ERR-PROPOSAL-NOT-FOUND u107)
(define-constant ERR-INVALID-TIMESTAMP u108)
(define-constant ERR-HUB-NOT-VERIFIED u109)
(define-constant ERR-INVALID-MIN-VOTES u110)
(define-constant ERR-INVALID-MAX-OPTIONS u111)
(define-constant ERR-PROPOSAL-UPDATE-NOT-ALLOWED u112)
(define-constant ERR-INVALID-UPDATE-PARAM u113)
(define-constant ERR-MAX-PROPOSALS-EXCEEDED u114)
(define-constant ERR-INVALID-PROPOSAL-TYPE u115)
(define-constant ERR-INVALID-WEIGHT u116)
(define-constant ERR-INVALID-STATUS u117)
(define-constant ERR-ALREADY-VOTED u118)
(define-constant ERR-VOTING-CLOSED u119)
(define-constant ERR-INVALID-OPTION u120)
(define-data-var next-proposal-id uint u0)
(define-data-var max-proposals uint u1000)
(define-data-var submission-fee uint u500)
(define-data-var hub-registry-contract (optional principal) none)
(define-map proposals
  uint
  {
    hub-id: uint,
    text: (string-utf8 500),
    goals: (string-utf8 300),
    voting-deadline: uint,
    threshold: uint,
    timestamp: uint,
    creator: principal,
    proposal-type: (string-utf8 50),
    weight: uint,
    status: bool,
    min-votes: uint,
    max-options: uint,
    vote-count: uint
  }
)
(define-map proposals-by-hub
  uint
  (list 100 uint)
)
(define-map proposal-updates
  uint
  {
    update-text: (string-utf8 500),
    update-goals: (string-utf8 300),
    update-timestamp: uint,
    updater: principal
  }
)
(define-map votes
  { proposal-id: uint, voter: principal }
  uint
)
(define-map vote-options
  uint
  (list 10 (string-utf8 100))
)
(define-read-only (get-proposal (id uint))
  (map-get? proposals id)
)
(define-read-only (get-proposal-updates (id uint))
  (map-get? proposal-updates id)
)
(define-read-only (get-votes-for-proposal (id uint) (voter principal))
  (map-get? votes { proposal-id: id, voter: voter })
)
(define-read-only (is-proposal-in-hub (hub-id uint) (proposal-id uint))
  (is-some (index-of? (unwrap! (map-get? proposals-by-hub hub-id) (err ERR-INVALID-HUB-ID)) proposal-id))
)
(define-private (validate-hub-id (hub uint))
  (if (> hub u0)
      (ok true)
      (err ERR-INVALID-HUB-ID))
)
(define-private (validate-text (text (string-utf8 500)))
  (if (and (> (len text) u0) (<= (len text) u500))
      (ok true)
      (err ERR-INVALID-PROPOSAL-TEXT))
)
(define-private (validate-goals (goals (string-utf8 300)))
  (if (and (> (len goals) u0) (<= (len goals) u300))
      (ok true)
      (err ERR-INVALID-GOALS))
)
(define-private (validate-voting-deadline (deadline uint))
  (if (> deadline block-height)
      (ok true)
      (err ERR-INVALID-VOTING-DEADLINE))
)
(define-private (validate-threshold (thresh uint))
  (if (and (> thresh u0) (<= thresh u100))
      (ok true)
      (err ERR-INVALID-THRESHOLD))
)
(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
      (ok true)
      (err ERR-INVALID-TIMESTAMP))
)
(define-private (validate-proposal-type (type (string-utf8 50)))
  (if (or (is-eq type "policy") (is-eq type "amendment") (is-eq type "initiative"))
      (ok true)
      (err ERR-INVALID-PROPOSAL-TYPE))
)
(define-private (validate-weight (w uint))
  (if (<= w u10)
      (ok true)
      (err ERR-INVALID-WEIGHT))
)
(define-private (validate-min-votes (min uint))
  (if (> min u0)
      (ok true)
      (err ERR-INVALID-MIN-VOTES))
)
(define-private (validate-max-options (max uint))
  (if (and (> max u0) (<= max u10))
      (ok true)
      (err ERR-INVALID-MAX-OPTIONS))
)
(define-private (validate-principal (p principal))
  (if (not (is-eq p 'SP000000000000000000002Q6VF78))
      (ok true)
      (err ERR-NOT-AUTHORIZED))
)
(define-public (set-hub-registry-contract (contract-principal principal))
  (begin
    (try! (validate-principal contract-principal))
    (asserts! (is-none (var-get hub-registry-contract)) (err ERR-HUB-NOT-VERIFIED))
    (var-set hub-registry-contract (some contract-principal))
    (ok true)
  )
)
(define-public (set-max-proposals (new-max uint))
  (begin
    (asserts! (> new-max u0) (err ERR-MAX-PROPOSALS-EXCEEDED))
    (asserts! (is-some (var-get hub-registry-contract)) (err ERR-HUB-NOT-VERIFIED))
    (var-set max-proposals new-max)
    (ok true)
  )
)
(define-public (set-submission-fee (new-fee uint))
  (begin
    (asserts! (>= new-fee u0) (err ERR-INVALID-UPDATE-PARAM))
    (asserts! (is-some (var-get hub-registry-contract)) (err ERR-HUB-NOT-VERIFIED))
    (var-set submission-fee new-fee)
    (ok true)
  )
)
(define-public (submit-proposal
  (hub-id uint)
  (text (string-utf8 500))
  (goals (string-utf8 300))
  (voting-deadline uint)
  (threshold uint)
  (proposal-type (string-utf8 50))
  (weight uint)
  (min-votes uint)
  (max-options uint)
  (options (list 10 (string-utf8 100)))
)
  (let (
        (next-id (var-get next-proposal-id))
        (current-max (var-get max-proposals))
        (hub-contract (var-get hub-registry-contract))
      )
    (asserts! (< next-id current-max) (err ERR-MAX-PROPOSALS-EXCEEDED))
    (try! (validate-hub-id hub-id))
    (try! (validate-text text))
    (try! (validate-goals goals))
    (try! (validate-voting-deadline voting-deadline))
    (try! (validate-threshold threshold))
    (try! (validate-proposal-type proposal-type))
    (try! (validate-weight weight))
    (try! (validate-min-votes min-votes))
    (try! (validate-max-options max-options))
    (let ((hub-recipient (unwrap! hub-contract (err ERR-HUB-NOT-VERIFIED))))
      (try! (stx-transfer? (var-get submission-fee) tx-sender hub-recipient))
    )
    (map-set proposals next-id
      {
        hub-id: hub-id,
        text: text,
        goals: goals,
        voting-deadline: voting-deadline,
        threshold: threshold,
        timestamp: block-height,
        creator: tx-sender,
        proposal-type: proposal-type,
        weight: weight,
        status: true,
        min-votes: min-votes,
        max-options: max-options,
        vote-count: u0
      }
    )
    (map-set vote-options next-id options)
    (map-set proposals-by-hub hub-id
      (unwrap! (as-max-len? (append (default-to (list) (map-get? proposals-by-hub hub-id)) next-id) u100) (err ERR-INVALID-HUB-ID)))
    (var-set next-proposal-id (+ next-id u1))
    (print { event: "proposal-submitted", id: next-id })
    (ok next-id)
  )
)
(define-public (update-proposal
  (proposal-id uint)
  (update-text (string-utf8 500))
  (update-goals (string-utf8 300))
)
  (let ((proposal (map-get? proposals proposal-id)))
    (match proposal
      p
        (begin
          (asserts! (is-eq (get creator p) tx-sender) (err ERR-NOT-AUTHORIZED))
          (asserts! (< block-height (get voting-deadline p)) (err ERR-VOTING-CLOSED))
          (try! (validate-text update-text))
          (try! (validate-goals update-goals))
          (map-set proposals proposal-id
            (merge p {
              text: update-text,
              goals: update-goals,
              timestamp: block-height
            })
          )
          (map-set proposal-updates proposal-id
            {
              update-text: update-text,
              update-goals: update-goals,
              update-timestamp: block-height,
              updater: tx-sender
            }
          )
          (print { event: "proposal-updated", id: proposal-id })
          (ok true)
        )
      (err ERR-PROPOSAL-NOT-FOUND)
    )
  )
)
(define-public (vote-on-proposal (proposal-id uint) (option-index uint))
  (let ((proposal (map-get? proposals proposal-id)))
    (match proposal
      p
        (begin
          (asserts! (>= block-height (get timestamp p)) (err ERR-INVALID-TIMESTAMP))
          (asserts! (< block-height (get voting-deadline p)) (err ERR-VOTING-CLOSED))
          (asserts! (is-none (map-get? votes { proposal-id: proposal-id, voter: tx-sender })) (err ERR-ALREADY-VOTED))
          (asserts! (< option-index (get max-options p)) (err ERR-INVALID-OPTION))
          (map-set votes { proposal-id: proposal-id, voter: tx-sender } option-index)
          (map-set proposals proposal-id
            (merge p { vote-count: (+ (get vote-count p) u1) })
          )
          (print { event: "vote-cast", proposal-id: proposal-id, voter: tx-sender })
          (ok true)
        )
      (err ERR-PROPOSAL-NOT-FOUND)
    )
  )
)
(define-public (get-proposal-count)
  (ok (var-get next-proposal-id))
)
(define-public (check-proposal-existence (hub-id uint) (proposal-id uint))
  (ok (is-proposal-in-hub hub-id proposal-id))
)
(define-read-only (get-vote-options (id uint))
  (map-get? vote-options id)
)
(define-read-only (get-vote-count (id uint))
  (default-to u0 (get vote-count (map-get? proposals id)))
)