# RiftCompiler

While custom chart can be played on Rift of the NecroDancer, currently the editor is not available, and editing JSON files directly is very annoying.

This is a simple program that enables people to create chart files quickly using simple text editors.

## How to Use

(TODO)

```bash
riftc demo/demo.rift -o demo/demo.json
```

## Chart Format

Check [the demo file](demo/demo.rift) for an example.

A chart consists of three sections: `[header]`, `[object]`, and `[body]`.

### Header

Arbitrary fields (other than `events`, which should be specified within the `[body]` section) for a chart JSON object can be specified in this section.

The values are specified one per line, like `name=value`. Spaces around the equal sign are ignored.

Here are currently available fields and their meanings. `bpm` and `beatDivisions` should be specified, and rests are optional.

| type | name | meaning |
| ---- | ---- | ------- |
| integer | `bpm` | BPM of the chart, which should be an integer. |
| integer | `beatDivisions` | Maximum \# of divisions per beat. |
| string | `name` | |
| string | `inputMappingOverrideJson` | |
| integer | `cameraZoomLevel` | |
| list of floats | `BeatTimings` | |

Currently, the values should be specified in accordance with the JSON syntax. For example, `name` should be specified like `name="Foobar"`, with double quotes.

### Object

Within this section, useful shorthands for body objects can be specified in the format of `name=value`.

Arbitrary characters, other than spaces, `#`, `-`, or `|` can be used as a name.

A value can either be predefined names or a JSON object.

Here are currently recommended list of definitions.

```text
[object]

S1 = GreenSlime
S2 = BlueSlime
S3 = YellowSlime

K1 = BaseSkeleton
K2 = ShieldSkeleton
K3 = TripleShieldBaseSkeleton

Ky = YellowSkeleton
KY = ShieldYellowSkeleton

Kb = BlackSkeleton
KB = ShieldBlackSkeleton

Hr = {"type":"SpawnEnemy","data":{"EnemyId":"Skull","ShouldStartFacingRight":true}}
Hl = {"type":"SpawnEnemy","data":{"EnemyId":"Skull","ShouldStartFacingRight":false}}
HR = {"type":"SpawnEnemy","data":{"EnemyId":"StrongSkull","ShouldStartFacingRight":true}}
HL = {"type":"SpawnEnemy","data":{"EnemyId":"StrongSkull","ShouldStartFacingRight":false}}

Br = {"type":"SpawnEnemy","data":{"EnemyId":"BlueBat","ShouldStartFacingRight":true}}
Bl = {"type":"SpawnEnemy","data":{"EnemyId":"BlueBat","ShouldStartFacingRight":false}}
BR = {"type":"SpawnEnemy","data":{"EnemyId":"YellowBat","ShouldStartFacingRight":true}}
BL = {"type":"SpawnEnemy","data":{"EnemyId":"YellowBat","ShouldStartFacingRight":false}}
B> = {"type":"SpawnEnemy","data":{"EnemyId":"RedBat","ShouldStartFacingRight":true}}
B< = {"type":"SpawnEnemy","data":{"EnemyId":"RedBat","ShouldStartFacingRight":false}}

Zr = {"type":"SpawnEnemy","data":{"EnemyId":"GreenZombie","ShouldStartFacingRight":true}}
Zl = {"type":"SpawnEnemy","data":{"EnemyId":"GreenZombie","ShouldStartFacingRight":false}}
ZR = {"type":"SpawnEnemy","data":{"EnemyId":"RedZombie","ShouldStartFacingRight":true}}
ZL = {"type":"SpawnEnemy","data":{"EnemyId":"RedZombie","ShouldStartFacingRight":false}}

M1 = BladeMaster
M2 = StrongBladeMaster

Hp = Harpy
Hq = QuickHarpy
Hs = StrongHarpy

F1 = Apple
F2 = Cheese
F3 = Drumstick
F4 = Ham

Wy = WyrmHead
```

### Body

The `[body]` section specifies list of events (including enemy spawns), which corresponds to `events` field of a chart JSON object.

**Note that the lines are read from bottom to top, to match how they appear in-game.**

There can be two kinds of lines: invoke lines and note lines.

`@name params`

`duration | notes`

Notes can either be a sequence of three identifiers or a JSON object.

An undefined identifier will be considered as a blank, and can't be longer than 2 characters long.

`|` specifies a continuation of a long note (wyrm).

#### Invokes

| name | params | description |
| ---- | ------ | ----------- |
| `beat` | beat number in floats | Sets the current beat number. |
| `debug` | any message | Prints the message while compiling, with line number and current beat number. |
| `raw` | any JSON object | Add the object to the chart. |
| `skip` | `true` or `false` | If set to `true`, all instructions until next `skip` will be ignored. |
| `bladeMasterAttackRow` | row number | Sets the default attack row (`BlademasterAttackRow`) for blademasters. (-1 to disable it.) |
| `portal` | `{"duration": duration, "in": [in_track, in_row], "out": [out_track, out_row]}` (all variables are numbers) | Creates a portal with given parameters. |

Note for raw objects:

- Use `data` instead of `dataPairs`. 
- By default, `startBeatNumber` and `endBeatNumber` will be set automatically.
  - You may override `startBeatNumber`, and set `duration` or `endBeatNumber` to override it.
